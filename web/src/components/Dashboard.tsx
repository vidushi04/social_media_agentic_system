import React from 'react';
import { Sparkles, Target, ArrowRight } from 'lucide-react';

interface DashboardProps {
  skillData: any;
}

export const Dashboard: React.FC<DashboardProps> = ({ skillData }) => {
  if (!skillData) return null;

  return (
    <div className="glass-panel" style={{ marginTop: '2rem', animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'rgba(139, 92, 246, 0.2)', padding: '1rem', borderRadius: '50%' }}>
          <Sparkles size={28} color="var(--accent-primary)" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.8rem' }}>New Skill Unlocked</h2>
          <p style={{ margin: 0, color: 'var(--accent-secondary)', fontWeight: 500 }}>
            {skillData.skill}
          </p>
        </div>
      </div>

      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          <Target size={18} color="var(--warning)" /> Why This Matters
        </h3>
        <p style={{ margin: 0, lineHeight: 1.6 }}>{skillData.why_it_matters}</p>
      </div>

      <div style={{ borderLeft: '4px solid var(--success)', paddingLeft: '1.5rem', marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Action Plan for Next Upload</h3>
        <p style={{ margin: 0, fontSize: '1.1rem', lineHeight: 1.6 }}>
          {skillData.try_this}
        </p>
      </div>

      <div style={{ marginTop: '2rem', textAlign: 'right' }}>
        <button className="btn-primary">
          Acknowledge & Practice <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
