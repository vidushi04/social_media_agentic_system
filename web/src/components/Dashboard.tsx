import React from 'react';
import { BarChart2, MessageSquare, ThumbsUp, ChevronUp } from 'lucide-react';
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
}

export const Dashboard: React.FC<DashboardProps> = ({
  skillData,
  patternData,
  videoMetrics,
  videoUrl,
  topContent = [],
  onReset,
  onGoToAgents,
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

  return (
    <div className="studio-analysis" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className="studio-perf-hero">
        <div className="studio-video-thumb">
          {thumbnail ? (
            <img src={thumbnail} alt={title} />
          ) : (
            <div className="studio-video-thumb-fallback">{title}</div>
          )}
          {title && <div className="studio-video-thumb-caption">{title}</div>}
        </div>

        <div className="studio-metrics-panel">
          <div className="studio-metrics-icons">
            <span className="studio-metric-pill">
              <BarChart2 size={20} />
              {views}
            </span>
            <span className="studio-metric-pill">
              <MessageSquare size={20} />
              {comments}
            </span>
            <span className="studio-metric-pill">
              <ThumbsUp size={20} />
              {likes}
            </span>
            <span className="studio-metrics-spacer" />
            <ChevronUp size={16} color="var(--studio-mute)" />
          </div>

          <div className="studio-stat-rows">
            <div className="studio-stat-row">
              <span>Views</span>
              <span className="studio-stat-value">{views}</span>
            </div>
            <div className="studio-stat-row">
              <span>Likes</span>
              <span className="studio-stat-value">{likes}</span>
            </div>
            <div className="studio-stat-row">
              <span>Comments</span>
              <span className="studio-stat-value">{comments}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="studio-insights-row">
        <div className="studio-insight-card studio-diagnosis-card">
          <h3 className="studio-section-heading studio-heading-accent">AI Diagnosis</h3>
          <p className="studio-insight-body">
            {patternData?.observation || 'No pattern observation available.'}
          </p>

          <div className="studio-divider" />

          <div className="studio-summary-block">
            <p className="studio-summary-title">Summary</p>
            <p className="studio-summary-sub">
              {patternData?.pattern_type
                ? `${patternData.pattern_type}${patternData.craft_element ? ` · ${patternData.craft_element}` : ''}`
                : 'This analysis'}
            </p>
            <div className="studio-summary-row">
              <span>Views</span>
              <span className="studio-stat-value">{views}</span>
              <span className="studio-trend" />
            </div>
            <div className="studio-summary-row">
              <span>Likes</span>
              <span className="studio-stat-value">{likes}</span>
              <span className="studio-trend" />
            </div>
          </div>

          <div className="studio-divider" />

          <div className="studio-summary-block">
            <p className="studio-summary-title">Top content</p>
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
          <h3 className="studio-section-heading studio-heading-accent">Recommended Micro-Skill</h3>
          <div className="studio-skill-cards">
            <div className="studio-insight-card">
              <h4 className="studio-card-heading">Why this Matters</h4>
              <p className="studio-insight-body">{skillData.why_it_matters}</p>
            </div>
            <div className="studio-insight-card">
              <h4 className="studio-card-heading">Action Plan for next Upload</h4>
              <p className="studio-insight-body">{skillData.try_this}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
