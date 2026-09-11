import React, { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, X } from 'lucide-react';
import type { AnalysisRecord } from '../utils/knowledgeBase';
import { buildHistoricalContext } from '../utils/knowledgeBase';
import { buildChatAnalysisPacket, type ChatMessage } from '../utils/chatAnalysis';
import { runChatWithAnalysisAgent } from '../utils/llm';

interface ChatWithAnalysisPanelProps {
  record: AnalysisRecord;
  onClose: () => void;
}

const SUGGESTED_QUESTIONS = [
  'Why this skill?',
  'What did viewers say?',
  'Compare to my last video.',
];

const MAX_QUESTION_LENGTH = 2000;

const makeId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const ChatWithAnalysisPanel: React.FC<ChatWithAnalysisPanelProps> = ({ record, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [historyContext, setHistoryContext] = useState('No historical creator analyses are available yet.');
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    buildHistoricalContext(3, { excludeId: record.id }).then((context) => {
      if (!cancelled) setHistoryContext(context);
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

  const sendThread = async (nextMessages: ChatMessage[]) => {
    sendingRef.current = true;
    setError('');
    setIsSending(true);
    try {
      const packet = buildChatAnalysisPacket(record);
      const answer = await runChatWithAnalysisAgent('', packet, historyContext, nextMessages);
      setMessages([
        ...nextMessages,
        {
          id: makeId(),
          role: 'assistant',
          text: answer,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (err) {
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
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content chat-analysis-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-analysis-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="chat-analysis-top">
          <div className="chat-analysis-heading">
            <Sparkles size={18} />
            <h2 id="chat-analysis-title">Chat with Analysis</h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="chat-analysis-thread" ref={threadRef}>
          {messages.length === 0 && (
            <div className="chat-analysis-empty">
              <p>Ask anything about this analysis — the diagnosis, the skill, or the comments.</p>
              <div className="chat-analysis-chips">
                {SUGGESTED_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    type="button"
                    className="chat-analysis-chip"
                    disabled={isSending}
                    onClick={() => void sendQuestion(question)}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`chat-analysis-bubble ${message.role === 'user' ? 'user' : 'assistant'}`}
            >
              {message.text}
            </div>
          ))}

          {isSending && (
            <div className="chat-analysis-bubble assistant pending">Thinking…</div>
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

        <form className="chat-analysis-composer" onSubmit={handleSubmit}>
          <textarea
            ref={inputRef}
            className="chat-analysis-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder="Ask about this analysis"
            rows={1}
            disabled={isSending}
            maxLength={MAX_QUESTION_LENGTH}
          />
          <button
            type="submit"
            className="onboarding-next chat-analysis-send"
            disabled={isSending || !draft.trim()}
            aria-label="Send"
          >
            <Send size={14} />
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
