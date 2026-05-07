import React from 'react';
import type { AnalysisRecord } from '../utils/knowledgeBase';

interface HistoryPanelProps {
  history: AnalysisRecord[];
}

const formatDate = (isoTimestamp: string) => {
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) return isoTimestamp;
  return parsed.toLocaleString();
};

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ history }) => {
  if (!history.length) {
    return (
      <div className="feature-card" style={{ marginTop: '2rem' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>No history yet</h3>
        <p style={{ margin: 0, color: 'var(--mute)' }}>
          Run your first analysis to start building personalized creator memory.
        </p>
      </div>
    );
  }

  const latestFirst = [...history].reverse();

  return (
    <div style={{ marginTop: '2rem', display: 'grid', gap: '1rem' }}>
      {latestFirst.map((entry, idx) => (
        <div key={`${entry.timestamp}-${idx}`} className="feature-card-soft" style={{ border: '1px solid var(--hairline)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{entry.dataCollector?.title || 'Untitled Analysis'}</h3>
            <span style={{ color: 'var(--mute)', fontSize: '0.85rem' }}>{formatDate(entry.timestamp)}</span>
          </div>

          <p style={{ marginBottom: '0.75rem', color: 'var(--mute)', fontSize: '0.9rem', wordBreak: 'break-all' }}>
            {entry.videoUrl}
          </p>

          <div style={{ background: 'var(--canvas)', borderRadius: 'var(--rounded-sm)', padding: '0.75rem', marginBottom: '0.5rem' }}>
            <strong style={{ color: 'var(--ink)' }}>Pattern:</strong>{' '}
            <span>{entry.pattern?.observation || 'No pattern observation saved.'}</span>
          </div>

          <div style={{ background: 'var(--canvas)', borderRadius: 'var(--rounded-sm)', padding: '0.75rem' }}>
            <strong style={{ color: 'var(--ink)' }}>Recommended Micro-Skill:</strong>{' '}
            <span>{entry.coach?.skill || 'No skill recommendation generated.'}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
