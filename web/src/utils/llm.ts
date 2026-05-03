import { GoogleGenAI, Type } from '@google/genai';
import {
  DECONSTRUCTOR_PROMPT,
  AUDIENCE_READER_PROMPT,
  PATTERN_DETECTOR_PROMPT,
  SKILL_COACH_PROMPT
} from '../agents/prompts';

let aiInstance: GoogleGenAI | null = null;

const getAI = (apiKey: string) => {
  if (!aiInstance || aiInstance.apiKey !== apiKey) {
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

// --- Agent Invocation Functions ---

export const runContentDeconstructor = async (apiKey: string, videoMetrics: any) => {
  const ai = getAI(apiKey);
  const input = `Title: ${videoMetrics.title}\nCategory: ${videoMetrics.categoryName}\nDescription: ${videoMetrics.description}\nTags: ${videoMetrics.tags?.join(', ')}`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
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
  });
  
  return JSON.parse(response.text || '{}');
};

export const runAudienceSignalReader = async (apiKey: string, comments: string[]) => {
  const ai = getAI(apiKey);
  const input = comments.length > 0 ? comments.join('\n---\n') : "No comments available for this video.";
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
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
  });
  
  return JSON.parse(response.text || '{}');
};

export const runPatternDetector = async (apiKey: string, deconstructorData: any, performanceData: any) => {
  const ai = getAI(apiKey);
  const input = `
Deconstructor Output: ${JSON.stringify(deconstructorData)}
Performance Output: ${JSON.stringify(performanceData)}
  `;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
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
  });
  
  return JSON.parse(response.text || '{}');
};

export const runSkillCoach = async (apiKey: string, patternData: any) => {
  const ai = getAI(apiKey);
  const input = JSON.stringify(patternData);
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: input,
    config: {
      systemInstruction: SKILL_COACH_PROMPT,
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
  });
  
  return JSON.parse(response.text || '{}');
};
