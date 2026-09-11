import React from 'react';
import { Eye, MessageSquare, ThumbsUp, TrendingUp, Sparkle, Sparkles, Lightbulb, ListChecks, Star } from 'lucide-react';
import { getThumbnailFromUrl } from '../utils/thumbnail';

interface TopContentItem {
  title: string;
  views: string;
}

interface DashboardProps {
  skillData: any;
  patternData?: any;
  videoMetrics?: any;
  videoUrl?: string;
  topContent?: TopContentItem[];
  onReset: () => void;
  onGoToAgents?: () => void;
  onChatWithAnalysis?: () => void;
}

// Splits a long-form paragraph into short bullet points so it reads as
// scannable takeaways instead of a wall of text.
const toBullets = (text?: string): string[] => {
  if (!text) return [];
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);
};

export const Dashboard: React.FC<DashboardProps> = ({
  skillData,
  patternData,
  videoMetrics,
  videoUrl,
  topContent = [],
  onReset,
  onGoToAgents,
  onChatWithAnalysis,
}) => {
  if (!skillData) return null;

  const thumbnail =
    videoMetrics?.thumbnailUrl ||
    getThumbnailFromUrl(videoUrl) ||
    null;

  const views = videoMetrics?.views ?? '—';
  const likes = videoMetrics?.likes ?? '—';
  const comments = videoMetrics?.comments ?? '—';
  const title = videoMetrics?.title || 'Analyzed video';

  const topRows = topContent.length
    ? topContent
    : [{ title, views }];

  const actionPlanBullets = toBullets(skillData.try_this);

  return (
    <div className="studio-analysis" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className="studio-perf-hero">
        <div className="studio-video-col studio-insight-card">
          <p className="studio-video-title">{title}</p>

          <div className="studio-video-thumb">
            {thumbnail ? (
              <img src={thumbnail} alt={title} />
            ) : (
              <div className="studio-video-thumb-fallback">{title}</div>
            )}
          </div>

          <div className="studio-stat-rows">
            <div className="studio-stat-row">
              <Eye size={16} color="var(--studio-mute)" />
              <span>Views</span>
              <span className="studio-stat-value">{views}</span>
            </div>
            <div className="studio-stat-row">
              <MessageSquare size={16} color="var(--studio-mute)" />
              <span>Comments</span>
              <span className="studio-stat-value">{comments}</span>
            </div>
            <div className="studio-stat-row">
              <ThumbsUp size={16} color="var(--studio-mute)" />
              <span>Likes</span>
              <span className="studio-stat-value">{likes}</span>
            </div>
          </div>

          <div className="studio-divider" />

          <div className="studio-summary-block">
            <p className="studio-summary-title studio-summary-title-icon">
              <TrendingUp size={15} />
              Top content
            </p>
            <p className="studio-summary-sub">Recent analyses · Views</p>
            {topRows.map((item, idx) => (
              <div className="studio-summary-row" key={`${item.title}-${idx}`}>
                <span>{item.title}</span>
                <span className="studio-stat-value">{item.views}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="studio-ghost-btn"
            onClick={onGoToAgents || onReset}
          >
            Go to channel analytics
          </button>
        </div>

        <div className="studio-skills-col">
          <button type="button" className="studio-chat-analysis-btn" onClick={onChatWithAnalysis}>
            <svg width="0" height="0" aria-hidden="true" focusable="false">
              <defs>
                <linearGradient id="chat-analysis-icon-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#e32140" />
                  <stop offset="100%" stopColor="#d1148f" />
                </linearGradient>
              </defs>
            </svg>
            <Sparkle
              size={18}
              fill="url(#chat-analysis-icon-gradient)"
              stroke="url(#chat-analysis-icon-gradient)"
              aria-hidden="true"
            />
            <span>Chat with Analysis</span>
          </button>

          <div className="studio-diagnosis-card">
            <div className="studio-icon-row">
              <Sparkles size={24} className="studio-icon-accent" />
              <div className="studio-icon-row-body">
                <h3 className="studio-section-heading studio-heading-accent">AI diagnosis</h3>
                <p className="studio-insight-body">
                  {patternData?.observation || 'No pattern observation available.'}
                </p>
              </div>
            </div>
          </div>

          <div className="studio-skill-card">
            <div className="studio-icon-row">
              <Lightbulb size={24} className="studio-icon-accent" />
              <div className="studio-icon-row-body">
                <h3 className="studio-section-heading studio-heading-accent">Trellis recommended micro-skill</h3>
                <p className="studio-skill-name">{skillData.skill || 'No micro-skill recommended yet.'}</p>
              </div>
            </div>

            <div className="studio-divider" />

            <div className="studio-skill-subcard">
              <div className="studio-icon-row">
                <ListChecks size={24} className="studio-icon-muted" />
                <div className="studio-icon-row-body">
                  <h4 className="studio-card-heading">Action plan for next upload</h4>
                  {actionPlanBullets.length > 1 ? (
                    <ul className="studio-bullet-list">
                      {actionPlanBullets.map((line, idx) => (
                        <li key={idx}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="studio-insight-body">{skillData.try_this || 'No action suggestion yet.'}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="studio-skill-subcard">
              <div className="studio-icon-row">
                <Star size={24} className="studio-icon-muted" />
                <div className="studio-icon-row-body">
                  <h4 className="studio-card-heading">Why this skill matters</h4>
                  <p className="studio-insight-body">{skillData.why_it_matters || 'No explanation available yet.'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
