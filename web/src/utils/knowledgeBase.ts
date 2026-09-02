import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface AnalysisRecord {
  id: string;
  timestamp: string;
  videoUrl: string;
  dataCollector: any;
  deconstructor: any;
  audience: any;
  pattern: any;
  coach: any;
}

const ANALYSIS_HISTORY_KEY = 'CREATOR_ANALYSIS_HISTORY_V1';
const LOCAL_MODE_KEY = 'TRELLIS_LOCAL_MODE';

const isLocalStorageBackend = (): boolean => {
  if (!isSupabaseConfigured || !supabase) return true;
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(LOCAL_MODE_KEY) === 'true';
};

export const clearLocalAnalysisHistory = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ANALYSIS_HISTORY_KEY);
};

const safeJsonParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

// ---------------------------------------------------------------------------
// localStorage backend — used whenever Supabase isn't configured, or the user
// hasn't signed in (local/demo mode). Kept as the original implementation.
// ---------------------------------------------------------------------------

const getAnalysisHistoryLocal = (): AnalysisRecord[] => {
  if (typeof window === 'undefined') return [];
  return safeJsonParse<AnalysisRecord[]>(window.localStorage.getItem(ANALYSIS_HISTORY_KEY), []);
};

export const hasLocalAnalysisHistory = (): boolean => getAnalysisHistoryLocal().length > 0;

const saveAnalysisToKnowledgeBaseLocal = (record: AnalysisRecord) => {
  if (typeof window === 'undefined') return;
  const current = getAnalysisHistoryLocal();
  const nextHistory = [...current, record];
  window.localStorage.setItem(ANALYSIS_HISTORY_KEY, JSON.stringify(nextHistory));
};

const deleteAnalysisFromHistoryLocal = (id: string) => {
  if (typeof window === 'undefined') return;
  const nextHistory = getAnalysisHistoryLocal().filter(entry => entry.id !== id);
  window.localStorage.setItem(ANALYSIS_HISTORY_KEY, JSON.stringify(nextHistory));
};

// ---------------------------------------------------------------------------
// Supabase backend — used when configured and a user is signed in. RLS scopes
// every query to the caller's own rows, so this is structurally incapable of
// reading or writing another user's data (not just filtered client-side).
// ---------------------------------------------------------------------------

interface AnalysisRow {
  id: string;
  user_id: string;
  video_url: string;
  data_collector: any;
  deconstructor: any;
  audience: any;
  pattern: any;
  coach: any;
  created_at: string;
}

const rowToRecord = (row: AnalysisRow): AnalysisRecord => ({
  id: row.id,
  timestamp: row.created_at,
  videoUrl: row.video_url,
  dataCollector: row.data_collector,
  deconstructor: row.deconstructor,
  audience: row.audience,
  pattern: row.pattern,
  coach: row.coach,
});

const getSupabaseUserId = async (): Promise<string | null> => {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
};

// ---------------------------------------------------------------------------
// Public API — all async since Supabase calls are inherently async. Falls
// back to localStorage transparently when Supabase isn't configured or no
// user is signed in.
// ---------------------------------------------------------------------------

export const getAnalysisHistory = async (): Promise<AnalysisRecord[]> => {
  if (!isLocalStorageBackend()) {
    const userId = await getSupabaseUserId();
    if (userId) {
      const { data, error } = await supabase!
        .from('analyses')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) {
        console.error('Failed to load analysis history from Supabase', error);
        return [];
      }
      return (data as AnalysisRow[]).map(rowToRecord);
    }
    return [];
  }
  return getAnalysisHistoryLocal();
};

export const saveAnalysisToKnowledgeBase = async (
  record: Omit<AnalysisRecord, 'id'> & { id?: string }
): Promise<void> => {
  if (!isLocalStorageBackend()) {
    const userId = await getSupabaseUserId();
    if (userId) {
      const { error } = await supabase!.from('analyses').insert({
        user_id: userId,
        video_url: record.videoUrl,
        data_collector: record.dataCollector,
        deconstructor: record.deconstructor,
        audience: record.audience,
        pattern: record.pattern,
        coach: record.coach,
      });
      if (error) console.error('Failed to save analysis to Supabase', error);
    }
    return;
  }
  saveAnalysisToKnowledgeBaseLocal({
    ...record,
    id: record.id || crypto.randomUUID(),
  });
};

export const deleteAnalysisFromHistory = async (id: string): Promise<void> => {
  if (!isLocalStorageBackend()) {
    const userId = await getSupabaseUserId();
    if (userId) {
      const { error } = await supabase!.from('analyses').delete().eq('id', id);
      if (error) console.error('Failed to delete analysis from Supabase', error);
    }
    return;
  }
  deleteAnalysisFromHistoryLocal(id);
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

export const buildHistoricalContext = async (maxItems = 5): Promise<string> => {
  const history = await getAnalysisHistory();
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
