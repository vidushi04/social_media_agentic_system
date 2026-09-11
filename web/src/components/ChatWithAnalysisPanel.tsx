import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ChevronRight, CircleX, Menu, Pencil, Plus } from 'lucide-react';
import type { AnalysisRecord } from '../utils/knowledgeBase';
import { getAnalysisHistory } from '../utils/knowledgeBase';
import {
  buildChatAnalysisPacket,
  formatChatHistoricalContext,
  getChatConversations,
  saveChatConversation,
  type ChatConversation,
  type ChatMessage,
} from '../utils/chatAnalysis';
import { runChatWithAnalysisAgent } from '../utils/llm';

interface ChatWithAnalysisPanelProps {
  record: AnalysisRecord;
  onClose: () => void;
  greetingName?: string;
  onResetAnalysis?: () => void;
}

const INITIAL_SUGGESTIONS = [
  'Why did you recommend this micro-skill?',
  'What in the comments supports this diagnosis?',
  'How does this compare to my last video?',
  'What should I try in the title next time?',
];

const MORE_SUGGESTIONS = [
  'What should I do next?',
  'Summarize this analysis.',
  'What is the strongest audience signal?',
];

const MAX_QUESTION_LENGTH = 2000;

const formatChatTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const makeId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const ChatWithAnalysisPanel: React.FC<ChatWithAnalysisPanelProps> = ({
  record,
  onClose,
  greetingName,
  onResetAnalysis,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [historyContext, setHistoryContext] = useState('No historical creator analyses are available yet.');
  const [showMoreSuggestions, setShowMoreSuggestions] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>(() =>
    getChatConversations(record.id)
  );
  const [conversationId, setConversationId] = useState(makeId);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false);

  const suggestions = showMoreSuggestions
    ? [...INITIAL_SUGGESTIONS, ...MORE_SUGGESTIONS]
    : INITIAL_SUGGESTIONS;
  const greeting = greetingName ? `Hello, ${greetingName}` : 'Hello';

  const persistConversation = (nextMessages: ChatMessage[], id = conversationId) => {
    saveChatConversation(record.id, {
      id,
      title: '',
      messages: nextMessages,
      updatedAt: new Date().toISOString(),
    });
    setConversations(getChatConversations(record.id));
  };

  const closeDrawer = () => {
    persistConversation(messages);
    onClose();
  };

  const handleTrellisClick = () => {
    persistConversation(messages);
    (onResetAnalysis || onClose)();
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (isHistoryOpen) {
        setIsHistoryOpen(false);
        return;
      }
      persistConversation(messages);
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, isHistoryOpen]);

  useEffect(() => {
    let cancelled = false;
    getAnalysisHistory().then((history) => {
      if (cancelled) return;
      const recent = history.filter((entry) => entry.id !== record.id).slice(-3);
      setHistoryContext(formatChatHistoricalContext(recent));
    });
    return () => {
      cancelled = true;
    };
  }, [record.id]);

  useEffect(() => {
    const node = threadRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, isSending]);

  const startNewConversation = () => {
    if (sendingRef.current) return;
    persistConversation(messages);
    setConversationId(makeId());
    setMessages([]);
    setDraft('');
    setError('');
    setShowMoreSuggestions(false);
    setIsHistoryOpen(false);
    inputRef.current?.focus();
  };

  const openHistory = () => {
    setConversations(getChatConversations(record.id));
    setIsHistoryOpen((open) => !open);
  };

  const loadConversation = (conversation: ChatConversation) => {
    if (sendingRef.current) return;
    persistConversation(messages);
    setConversationId(conversation.id);
    setMessages(conversation.messages);
    setDraft('');
    setError('');
    setShowMoreSuggestions(false);
    setIsHistoryOpen(false);
  };

  const sendThread = async (nextMessages: ChatMessage[]) => {
    sendingRef.current = true;
    setError('');
    setIsSending(true);
    try {
      const packet = buildChatAnalysisPacket(record);
      const answer = await runChatWithAnalysisAgent('', packet, historyContext, nextMessages);
      const reply: ChatMessage = {
        id: makeId(),
        role: 'assistant',
        text: answer,
        createdAt: new Date().toISOString(),
      };
      const withReply = [...nextMessages, reply];
      setMessages(withReply);
      persistConversation(withReply);
    } catch (err) {
      persistConversation(nextMessages);
      setError(err instanceof Error ? err.message : 'Could not get a reply. Please try again.');
    }
    sendingRef.current = false;
    setIsSending(false);
  };

  const sendQuestion = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || sendingRef.current) return;
    sendingRef.current = true;
    if (text.length > MAX_QUESTION_LENGTH) {
      sendingRef.current = false;
      setError(`Keep questions under ${MAX_QUESTION_LENGTH} characters.`);
      return;
    }

    const nextMessages: ChatMessage[] = [
      ...messages,
      {
        id: makeId(),
        role: 'user',
        text,
        createdAt: new Date().toISOString(),
      },
    ];
    setMessages(nextMessages);
    setDraft('');
    await sendThread(nextMessages);
  };

  const retryLast = () => {
    const lastUser = [...messages].reverse().find((message) => message.role === 'user');
    if (!lastUser || sendingRef.current) return;
    const upToLastUser: ChatMessage[] = [];
    for (const message of messages) {
      upToLastUser.push(message);
      if (message.id === lastUser.id) break;
    }
    setMessages(upToLastUser);
    void sendThread(upToLastUser);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendQuestion(draft);
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendQuestion(draft);
    }
  };

  return (
    <motion.div
      className="chat-analysis-layer"
      initial="hidden"
      animate="visible"
      exit="hidden"
    >
      <motion.div
        className="chat-analysis-scrim"
        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
        transition={{ duration: 0.2 }}
        onClick={closeDrawer}
      />
      <motion.aside
        className="chat-analysis-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-analysis-title"
        variants={{ hidden: { x: '100%' }, visible: { x: 0 } }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="chat-analysis-header">
          <div className="chat-analysis-header-left">
            <button
              type="button"
              className="chat-analysis-icon-btn"
              aria-label="Chat history"
              aria-expanded={isHistoryOpen}
              onClick={openHistory}
            >
              <Menu size={20} />
            </button>
            <div className="chat-analysis-brand">
              <span>Ask</span>
              <button
                type="button"
                className="chat-analysis-brand-logo"
                id="chat-analysis-title"
                onClick={handleTrellisClick}
                aria-label="Start a new analysis"
              >
                Trellis
              </button>
            </div>
          </div>
          <div className="chat-analysis-header-right">
            <button
              type="button"
              className="chat-analysis-icon-btn"
              onClick={startNewConversation}
              aria-label="Start a new conversation"
            >
              <Pencil size={20} />
            </button>
            <button
              type="button"
              className="chat-analysis-icon-btn"
              onClick={closeDrawer}
              aria-label="Close"
            >
              <CircleX size={20} />
            </button>
          </div>
        </div>

        <div className="chat-analysis-divider" />

        <div className={`chat-analysis-thread ${messages.length > 0 ? 'has-messages' : ''}`} ref={threadRef}>
          {messages.length === 0 && (
            <div className="chat-analysis-greeting">
              <p className="chat-analysis-hello">{greeting}</p>
              <p className="chat-analysis-help">How can I help you?</p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`chat-analysis-row ${message.role === 'user' ? 'user' : 'assistant'}`}
            >
              <div className={`chat-analysis-bubble ${message.role === 'user' ? 'user' : 'assistant'}`}>
                {message.text}
              </div>
              <p className="chat-analysis-time">{formatChatTime(message.createdAt)}</p>
            </div>
          ))}

          {isSending && (
            <div className="chat-analysis-row assistant">
              <div className="chat-analysis-bubble assistant pending">Thinking…</div>
            </div>
          )}

          {messages.length === 0 && !isSending && (
            <div className="chat-analysis-suggestions">
              <div className="chat-analysis-pills">
                {suggestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    className="chat-analysis-pill"
                    disabled={isSending}
                    onClick={() => void sendQuestion(question)}
                  >
                    {question}
                  </button>
                ))}
              </div>
              {!showMoreSuggestions && (
                <button
                  type="button"
                  className="chat-analysis-more"
                  onClick={() => setShowMoreSuggestions(true)}
                >
                  More suggestions
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="chat-analysis-error">
            <p>{error}</p>
            <button type="button" className="chat-analysis-retry" onClick={retryLast} disabled={isSending}>
              Retry
            </button>
          </div>
        )}

        <div className="chat-analysis-divider" />

        <form className="chat-analysis-footer" onSubmit={handleSubmit}>
          <div className="chat-analysis-input-row">
            <button type="button" className="chat-analysis-plus" aria-label="Add">
              <Plus size={16} />
            </button>
            <textarea
              ref={inputRef}
              className="chat-analysis-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="Ask something"
              rows={1}
              disabled={isSending}
              maxLength={MAX_QUESTION_LENGTH}
            />
            <button
              type="submit"
              className="chat-analysis-send"
              disabled={isSending || !draft.trim()}
              aria-label="Send"
            >
              <ArrowRight size={16} />
            </button>
          </div>
          <p className="chat-analysis-disclaimer">
            AI can make mistakes. You are responsible for the content you publish.{' '}
            <span className="link">Learn more</span>
          </p>
        </form>

        <AnimatePresence>
          {isHistoryOpen && (
            <>
              <motion.button
                key="history-scrim"
                type="button"
                className="chat-analysis-history-scrim"
                aria-label="Close chat history"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={() => setIsHistoryOpen(false)}
              />
              <motion.div
                key="history-panel"
                className="chat-analysis-history"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="chat-analysis-history-header">
                  <p>Chat history</p>
                  <button
                    type="button"
                    className="chat-analysis-icon-btn"
                    onClick={() => setIsHistoryOpen(false)}
                    aria-label="Close chat history"
                  >
                    <CircleX size={20} />
                  </button>
                </div>
                <div className="chat-analysis-history-list">
                  {conversations.length === 0 ? (
                    <p className="chat-analysis-history-empty">No conversations yet.</p>
                  ) : (
                    conversations.map((conversation) => (
                      <button
                        key={conversation.id}
                        type="button"
                        className={`chat-analysis-history-item ${conversation.id === conversationId ? 'active' : ''}`}
                        onClick={() => loadConversation(conversation)}
                      >
                        {conversation.title}
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.aside>
    </motion.div>
  );
};
