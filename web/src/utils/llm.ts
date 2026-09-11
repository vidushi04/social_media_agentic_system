import { GoogleGenAI, Type } from '@google/genai';
import {
  DECONSTRUCTOR_PROMPT,
  AUDIENCE_READER_PROMPT,
  PATTERN_DETECTOR_PROMPT,
  COACH_PROMPT,
  CHAT_WITH_ANALYSIS_PROMPT,
} from '../agents/prompts';
import type { ChatMessage } from './chatAnalysis';

const GEMINI_MODEL = 'gemini-2.5-pro';

let aiInstance: GoogleGenAI | null = null;
let activeApiKey: string | null = null;
let geminiQueue: Promise<void> = Promise.resolve();
let lastGeminiRequestAt = 0;

const MIN_GEMINI_INTERVAL_MS = 2000;

const getAI = (apiKey: string) => {
  if (!aiInstance || activeApiKey !== apiKey) {
    aiInstance = new GoogleGenAI({ apiKey });
    activeApiKey = apiKey;
  }
  return aiInstance;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const scheduleGeminiRequest = async <T>(task: () => Promise<T>): Promise<T> => {
  const run = async () => {
    const waitMs = Math.max(0, MIN_GEMINI_INTERVAL_MS - (Date.now() - lastGeminiRequestAt));
    if (waitMs > 0) {
      await delay(waitMs);
    }
    const result = await task();
    lastGeminiRequestAt = Date.now();
    return result;
  };

  const pending = geminiQueue.then(run, run);
  geminiQueue = pending.then(() => undefined, () => undefined);
  return pending;
};

// With a manually entered key (settings modal) we call Gemini directly via the SDK.
// Without one, requests go through /api/gemini so the production key stays server-side.
const generateJson = async (
  apiKey: string,
  input: string,
  systemInstruction: string,
  responseSchema: any
): Promise<any> => {
  const text = await scheduleGeminiRequest(async () => {
    if (apiKey.trim()) {
      const ai = getAI(apiKey.trim());
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: input,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema
        }
      });
      return response.text || '{}';
    }

    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, systemInstruction, responseSchema })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Gemini request failed.');
    }
    return data.text || '{}';
  });

  return JSON.parse(text);
};

// --- Agent Invocation Functions ---

export const runContentDeconstructor = async (apiKey: string, videoMetrics: any, historicalContext: string = '') => {
  const input = [
    `Creator Historical Knowledge:\n${historicalContext || 'No prior context available.'}`,
    '',
    `Title: ${videoMetrics.title}`,
    `Category: ${videoMetrics.categoryName}`,
    `Description: ${videoMetrics.description}`,
    `Tags: ${videoMetrics.tags?.join(', ')}`
  ].join('\n');

  return generateJson(apiKey, input, DECONSTRUCTOR_PROMPT, {
    type: Type.OBJECT,
    properties: {
      hook_type: { type: Type.STRING, description: "Hypothesized hook type based on title" },
      packaging_style: { type: Type.STRING, description: "How the title and category package the value" },
      click_curiosity_gap: { type: Type.STRING, description: "Does the title create a curiosity gap? Describe it." },
    },
  });
};

export const runAudienceSignalReader = async (apiKey: string, comments: string[], historicalContext: string = '') => {
  const commentsInput = comments.length > 0 ? comments.join('\n---\n') : 'No comments available for this video.';
  const input = [
    `Creator Historical Knowledge:\n${historicalContext || 'No prior context available.'}`,
    '',
    commentsInput
  ].join('\n');

  return generateJson(apiKey, input, AUDIENCE_READER_PROMPT, {
    type: Type.OBJECT,
    properties: {
      signal_type: { type: Type.STRING, description: "e.g., Emerging Theme, Shift Detected" },
      observation: { type: Type.STRING, description: "What you noticed in audience behavior" },
      confidence: { type: Type.STRING, description: "Emerging, Developing, or Strong" }
    },
  });
};

export const runPatternDetector = async (
  apiKey: string,
  deconstructorData: any,
  performanceData: any,
  audienceData: any,
  historicalContext: string = ''
) => {
  const input = `
Creator Historical Knowledge:
${historicalContext || 'No prior context available.'}

Deconstructor Output: ${JSON.stringify(deconstructorData)}
Performance Output: ${JSON.stringify(performanceData)}
Audience Output: ${JSON.stringify(audienceData)}
  `;

  return generateJson(apiKey, input, PATTERN_DETECTOR_PROMPT, {
    type: Type.OBJECT,
    properties: {
      pattern_type: { type: Type.STRING, description: "Strength or Weakness" },
      observation: { type: Type.STRING, description: "The core pattern observed across craft and metrics" },
      craft_element: { type: Type.STRING, description: "Which specific element is involved" },
      actionable_pattern_found: { type: Type.BOOLEAN, description: "Set to true if there is a pattern to act on" }
    },
  });
};

export const runCoach = async (apiKey: string, patternData: any, historicalContext: string = '') => {
  const input = [
    `Creator Historical Knowledge:\n${historicalContext || 'No prior context available.'}`,
    '',
    `Current Pattern Data:\n${JSON.stringify(patternData)}`
  ].join('\n');

  return generateJson(apiKey, input, COACH_PROMPT, {
    type: Type.OBJECT,
    properties: {
      skill: { type: Type.STRING, description: "Name of the micro-skill" },
      why_it_matters: { type: Type.STRING, description: "1-2 sentences explaining the craft principle" },
      try_this: { type: Type.STRING, description: "A specific, concrete suggestion for their next post" }
    },
  });
};

type GeminiChatContent = { role: 'user' | 'model'; text: string };

const MAX_CHAT_TURNS = 12;

const generateText = async (
  apiKey: string,
  systemInstruction: string,
  contents: GeminiChatContent[]
): Promise<string> => {
  const text = await scheduleGeminiRequest(async () => {
    if (apiKey.trim()) {
      const ai = getAI(apiKey.trim());
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: contents.map((item) => ({
          role: item.role,
          parts: [{ text: item.text }],
        })),
        config: { systemInstruction },
      });
      return response.text || '';
    }

    const res = await fetch('/api/gemini-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction, messages: contents }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const serverError = typeof data?.error === 'string' ? data.error : '';
      if (serverError) throw new Error(serverError);
      if (res.status === 404) {
        throw new Error('Chat is not available on this local server. Restart the Vite app so /api/gemini-chat can load.');
      }
      throw new Error('Gemini chat request failed.');
    }
    return data.text || '';
  });

  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('The analysis agent returned an empty reply. Please try again.');
  }
  return trimmed;
};

export const runChatWithAnalysisAgent = async (
  apiKey: string,
  packet: unknown,
  historicalContext: string,
  messages: ChatMessage[]
): Promise<string> => {
  const recent = messages
    .filter((message) => message.text.trim())
    .slice(-MAX_CHAT_TURNS);

  if (!recent.length || recent[recent.length - 1].role !== 'user') {
    throw new Error('Send a question about this analysis first.');
  }

  const packetBlock = [
    'Current analysis packet:',
    JSON.stringify(packet),
    '',
    'Historical analyses (optional):',
    historicalContext || 'No historical creator analyses are available yet.',
  ].join('\n');

  const contents: GeminiChatContent[] = [
    { role: 'user', text: packetBlock },
    { role: 'model', text: 'I have the analysis packet. Ask your question about this video analysis.' },
    ...recent.map((message) => ({
      role: (message.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
      text: message.text,
    })),
  ];

  return generateText(apiKey, CHAT_WITH_ANALYSIS_PROMPT, contents);
};
