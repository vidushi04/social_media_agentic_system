export interface AnalysisRecord {
  timestamp: string;
  videoUrl: string;
  dataCollector: any;
  deconstructor: any;
  audience: any;
  pattern: any;
  coach: any;
}

const ANALYSIS_HISTORY_KEY = 'CREATOR_ANALYSIS_HISTORY_V1';

const safeJsonParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const getAnalysisHistory = (): AnalysisRecord[] => {
  if (typeof window === 'undefined') return [];
  return safeJsonParse<AnalysisRecord[]>(window.localStorage.getItem(ANALYSIS_HISTORY_KEY), []);
};

export const buildKnowledgeBaseMarkdown = (history: AnalysisRecord[]): string => {
  const header = [
    '# Creator Knowledge Base',
    '',
    'This file is auto-generated from the agentic analysis pipeline.',
    `Last updated: ${new Date().toISOString()}`,
    '',
    '---',
    ''
  ].join('\n');

  const entries = history.map((entry, index) => {
    return [
      `## Analysis ${index + 1}`,
      `- Timestamp: ${entry.timestamp}`,
      `- Video URL: ${entry.videoUrl}`,
      '',
      '### Video Data Collector',
      '```json',
      JSON.stringify(entry.dataCollector ?? {}, null, 2),
      '```',
      '',
      '### Content Deconstructor',
      '```json',
      JSON.stringify(entry.deconstructor ?? {}, null, 2),
      '```',
      '',
      '### Audience Signal Reader',
      '```json',
      JSON.stringify(entry.audience ?? {}, null, 2),
      '```',
      '',
      '### Pattern Detector',
      '```json',
      JSON.stringify(entry.pattern ?? {}, null, 2),
      '```',
      '',
      '### Coach',
      '```json',
      JSON.stringify(entry.coach ?? {}, null, 2),
      '```',
      '',
      '---',
      ''
    ].join('\n');
  });

  return `${header}${entries.join('')}`;
};

export const saveAnalysisToKnowledgeBase = (record: AnalysisRecord) => {
  if (typeof window === 'undefined') return;
  const current = getAnalysisHistory();
  const nextHistory = [...current, record];
  window.localStorage.setItem(ANALYSIS_HISTORY_KEY, JSON.stringify(nextHistory));
};

export const buildHistoricalContext = (maxItems = 5): string => {
  const history = getAnalysisHistory();
  if (!history.length) {
    return 'No historical creator analyses are available yet.';
  }

  const recent = history.slice(-maxItems);
  return recent
    .map((entry, index) => {
      return [
        `Historical Analysis ${index + 1}:`,
        `Timestamp: ${entry.timestamp}`,
        `Video URL: ${entry.videoUrl}`,
        `Data Collector: ${JSON.stringify(entry.dataCollector ?? {})}`,
        `Deconstructor: ${JSON.stringify(entry.deconstructor ?? {})}`,
        `Audience: ${JSON.stringify(entry.audience ?? {})}`,
        `Pattern: ${JSON.stringify(entry.pattern ?? {})}`,
        `Coach: ${JSON.stringify(entry.coach ?? {})}`
      ].join('\n');
    })
    .join('\n\n');
};
