import { GoogleGenAI, Type } from '@google/genai';
import {
  DECONSTRUCTOR_PROMPT,
  AUDIENCE_READER_PROMPT,
  PATTERN_DETECTOR_PROMPT,
  COACH_PROMPT
} from '../agents/prompts';

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

// --- Agent Invocation Functions ---

export const runContentDeconstructor = async (apiKey: string, videoMetrics: any, historicalContext: string = '') => {
  const ai = getAI(apiKey);
  const input = [
    `Creator Historical Knowledge:\n${historicalContext || 'No prior context available.'}`,
    '',
    `Title: ${videoMetrics.title}`,
    `Category: ${videoMetrics.categoryName}`,
    `Description: ${videoMetrics.description}`,
    `Tags: ${videoMetrics.tags?.join(', ')}`
  ].join('\n');
  
  const response = await scheduleGeminiRequest(() => ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: input,
    config: {
      systemInstruction: DECONSTRUCTOR_PROMPT,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hook_type: { type: Type.STRING, description: "Hypothesized hook type based on title" },
          packaging_style: { type: Type.STRING, description: "How the title and category package the value" },
          click_curiosity_gap: { type: Type.STRING, description: "Does the title create a curiosity gap? Describe it." },
        },
      }
    }
  }));
  
  return JSON.parse(response.text || '{}');
};

export const runAudienceSignalReader = async (apiKey: string, comments: string[], historicalContext: string = '') => {
  const ai = getAI(apiKey);
  const commentsInput = comments.length > 0 ? comments.join('\n---\n') : 'No comments available for this video.';
  const input = [
    `Creator Historical Knowledge:\n${historicalContext || 'No prior context available.'}`,
    '',
    commentsInput
  ].join('\n');
  
  const response = await scheduleGeminiRequest(() => ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: input,
    config: {
      systemInstruction: AUDIENCE_READER_PROMPT,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          signal_type: { type: Type.STRING, description: "e.g., Emerging Theme, Shift Detected" },
          observation: { type: Type.STRING, description: "What you noticed in audience behavior" },
          confidence: { type: Type.STRING, description: "Emerging, Developing, or Strong" }
        },
      }
    }
  }));
  
  return JSON.parse(response.text || '{}');
};

export const runPatternDetector = async (
  apiKey: string,
  deconstructorData: any,
  performanceData: any,
  audienceData: any,
  historicalContext: string = ''
) => {
  const ai = getAI(apiKey);
  const input = `
Creator Historical Knowledge:
${historicalContext || 'No prior context available.'}

Deconstructor Output: ${JSON.stringify(deconstructorData)}
Performance Output: ${JSON.stringify(performanceData)}
Audience Output: ${JSON.stringify(audienceData)}
  `;
  
  const response = await scheduleGeminiRequest(() => ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: input,
    config: {
      systemInstruction: PATTERN_DETECTOR_PROMPT,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          pattern_type: { type: Type.STRING, description: "Strength or Weakness" },
          observation: { type: Type.STRING, description: "The core pattern observed across craft and metrics" },
          craft_element: { type: Type.STRING, description: "Which specific element is involved" },
          actionable_pattern_found: { type: Type.BOOLEAN, description: "Set to true if there is a pattern to act on" }
        },
      }
    }
  }));
  
  return JSON.parse(response.text || '{}');
};

export const runCoach = async (apiKey: string, patternData: any, historicalContext: string = '') => {
  const ai = getAI(apiKey);
  const input = [
    `Creator Historical Knowledge:\n${historicalContext || 'No prior context available.'}`,
    '',
    `Current Pattern Data:\n${JSON.stringify(patternData)}`
  ].join('\n');
  
  const response = await scheduleGeminiRequest(() => ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: input,
    config: {
      systemInstruction: COACH_PROMPT,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          skill: { type: Type.STRING, description: "Name of the micro-skill" },
          why_it_matters: { type: Type.STRING, description: "1-2 sentences explaining the craft principle" },
          try_this: { type: Type.STRING, description: "A specific, concrete suggestion for their next post" }
        },
      }
    }
  }));
  
  return JSON.parse(response.text || '{}');
};
