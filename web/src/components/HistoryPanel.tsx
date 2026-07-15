import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { AnalysisRecord } from '../utils/knowledgeBase';
import { formatAnalysisDate, getThumbnailFromUrl } from '../utils/thumbnail';

interface HistoryPanelProps {
  history: AnalysisRecord[];
  onSelect?: (entry: AnalysisRecord) => void;
  onDelete?: (entry: AnalysisRecord) => void;
  compact?: boolean;
  initialLimit?: number;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  onSelect,
  onDelete,
  compact = false,
  initialLimit = 3,
}) => {
  const [showAll, setShowAll] = useState(!compact);

  if (!history.length) {
    return (
      <div className="studio-past-card">
        <div className="studio-past-dash" />
        <h3 className="studio-section-heading" style={{ textAlign: 'center' }}>
          Your past content analysis
        </h3>
        <p style={{ margin: '1rem 0 0', color: 'var(--studio-mute)', textAlign: 'center', fontSize: '13px' }}>
          Run your first analysis to start building personalized creator memory.
        </p>
      </div>
    );
  }

  const latestFirst = [...history].reverse();
  const visible = showAll ? latestFirst : latestFirst.slice(0, initialLimit);

  return (
    <div className="studio-past-card">
      <div className="studio-past-dash" />
      <h3 className="studio-section-heading" style={{ textAlign: 'center', marginBottom: '28px' }}>
        Your past content analysis
      </h3>

      <div className="studio-past-header">
        <span>Content</span>
        <span>Date</span>
      </div>
      <div className="studio-divider" />

      {visible.map((entry, idx) => {
        const thumb =
          entry.dataCollector?.thumbnailUrl ||
          getThumbnailFromUrl(entry.videoUrl);
        const title =
          entry.dataCollector?.title ||
          entry.coach?.skill ||
          'View Detailed Analysis';

        return (
          <div
            key={`${entry.timestamp}-${idx}`}
            role="button"
            tabIndex={0}
            className="studio-past-row"
            onClick={() => onSelect?.(entry)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect?.(entry);
              }
            }}
          >
            <span className="studio-past-index">{idx + 1}</span>
            <div className="studio-past-thumb">
              {thumb ? (
                <img src={thumb} alt="" />
              ) : (
                <div className="studio-past-thumb-fallback" />
              )}
            </div>
            <div className="studio-past-meta">
              <span className="studio-past-title">{title}</span>
              <span className="studio-past-url">{entry.videoUrl}</span>
            </div>
            <span className="studio-past-date">{formatAnalysisDate(entry.timestamp)}</span>
            {onDelete && (
              <button
                type="button"
                className="studio-past-delete"
                title="Delete this analysis"
                aria-label={`Delete analysis of ${title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(entry);
                }}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        );
      })}

      {!showAll && latestFirst.length > initialLimit && (
        <>
          <div className="studio-divider" />
          <div className="studio-past-actions">
            <button type="button" className="studio-see-more" onClick={() => setShowAll(true)}>
              See more
            </button>
          </div>
        </>
      )}
    </div>
  );
};
