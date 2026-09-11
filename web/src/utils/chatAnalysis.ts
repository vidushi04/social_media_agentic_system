import type { AnalysisRecord } from './knowledgeBase';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
}

const DESCRIPTION_CAP = 500;

const clip = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
};

export const conversationTitleFromMessages = (messages: ChatMessage[]): string => {
  const firstUser = messages.find((message) => message.role === 'user');
  if (!firstUser?.text.trim()) return 'New conversation';
  const text = firstUser.text.trim();
  return text.length > 48 ? `${text.slice(0, 48)}…` : text;
};

const CHAT_STORE_KEY = 'TRELLIS_CHAT_WITH_ANALYSIS_V1';

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
}

const readChatStore = (): Record<string, ChatConversation[]> => {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CHAT_STORE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const getChatConversations = (analysisId: string): ChatConversation[] => {
  const list = readChatStore()[analysisId] || [];
  return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};

export const saveChatConversation = (analysisId: string, conversation: ChatConversation): void => {
  if (typeof window === 'undefined') return;
  if (!conversation.messages.some((message) => message.role === 'user')) return;
  const store = readChatStore();
  const next = [
    {
      ...conversation,
      title: conversationTitleFromMessages(conversation.messages),
      updatedAt: conversation.updatedAt || new Date().toISOString(),
    },
    ...(store[analysisId] || []).filter((item) => item.id !== conversation.id),
  ];
  store[analysisId] = next;
  window.localStorage.setItem(CHAT_STORE_KEY, JSON.stringify(store));
};

export const buildChatAnalysisPacket = (record: AnalysisRecord) => {
  const dc = record.dataCollector ?? {};
  const tags = Array.isArray(dc.tags) ? dc.tags.slice(0, 20) : [];

  return {
    video: {
      title: dc.title ?? null,
      url: record.videoUrl,
      views: dc.views ?? dc.viewCount ?? null,
      likes: dc.likes ?? dc.likeCount ?? null,
      comments: dc.comments ?? dc.commentCount ?? null,
      category: dc.categoryName ?? dc.category ?? null,
      channel: dc.channel ?? dc.channelTitle ?? null,
      tags,
      description: clip(dc.description, DESCRIPTION_CAP),
    },
    deconstructor: record.deconstructor ?? null,
    audience: record.audience ?? null,
    pattern: record.pattern ?? null,
    coach: record.coach ?? null,
  };
};
