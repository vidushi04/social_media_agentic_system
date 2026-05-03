import React from 'react';
import { Sparkles, Target, RotateCcw } from 'lucide-react';

interface DashboardProps {
  skillData: any;
  patternData?: any;
  onReset: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ skillData, patternData, onReset }) => {
  if (!skillData) return null;

  return (
    <div className="feature-card" style={{ marginTop: '2rem', animation: 'fadeIn 0.5s ease-out' }}>
      {patternData && (
        <div style={{ background: 'var(--surface-card)', padding: '1.5rem', borderRadius: 'var(--rounded-md)', marginBottom: '1.5rem', borderLeft: `4px solid ${patternData.pattern_type === 'Strength' ? 'var(--success-deep)' : 'var(--error)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--ink)' }}>
              AI Diagnosis: {patternData.pattern_type}
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {patternData.craft_element}
            </span>
          </div>
          <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--body)' }}>{patternData.observation}</p>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'var(--secondary-bg)', padding: '1rem', borderRadius: '50%' }}>
          <Sparkles size={28} color="var(--primary)" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--ink)' }}>Recommended Micro-Skill</h2>
          <p style={{ margin: 0, color: 'var(--primary)', fontWeight: 600 }}>
            {skillData.skill}
          </p>
        </div>
      </div>

      <div style={{ background: 'var(--surface-card)', padding: '1.5rem', borderRadius: 'var(--rounded-md)', marginBottom: '1.5rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>
          <Target size={18} color="var(--primary)" /> Why This Matters
        </h3>
        <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--body)' }}>{skillData.why_it_matters}</p>
      </div>

      <div style={{ borderLeft: '4px solid var(--success-deep)', paddingLeft: '1.5rem', marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>Action Plan for Next Upload</h3>
        <p style={{ margin: 0, fontSize: '1.1rem', lineHeight: 1.6, color: 'var(--body)' }}>
          {skillData.try_this}
        </p>
      </div>

      <div style={{ marginTop: '2rem', textAlign: 'right' }}>
        <button className="btn-secondary" onClick={onReset} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <RotateCcw size={16} /> Analyze Another Video
        </button>
      </div>
    </div>
  );
};
