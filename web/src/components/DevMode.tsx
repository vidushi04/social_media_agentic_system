import React from 'react';
import type { OrchestratorState } from '../agents/Orchestrator';
import { Terminal, Activity, CheckCircle2, Clock } from 'lucide-react';

interface DevModeProps {
  isOpen: boolean;
  onClose: () => void;
  state: OrchestratorState | null;
}

export const DevMode: React.FC<DevModeProps> = ({ isOpen, onClose, state }) => {
  if (!isOpen) return null;

  return (
    <div className={`dev-overlay ${isOpen ? 'open' : ''}`}>
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.2rem' }}>
          <Terminal size={20} /> Dev Mode
        </h2>
        <button className="btn-secondary" onClick={onClose} style={{ padding: '0.25rem 0.5rem' }}>
          Close
        </button>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.9rem' }}>
          Real-time visualization of the multi-agent orchestration engine.
        </p>
      </div>

      {state && Object.values(state.agents).map((agent) => (
        <div key={agent.id} className="agent-card">
          <div className="agent-header">
            {agent.status === 'running' && <Activity size={16} className="animate-pulse-glow" style={{ color: 'var(--warning)' }} />}
            {agent.status === 'completed' && <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />}
            {agent.status === 'idle' && <Clock size={16} style={{ color: 'var(--text-muted)' }} />}
            <span style={{ color: 'var(--text-primary)' }}>{agent.name}</span>
            <span style={{ marginLeft: 'auto' }} className={`agent-status ${agent.status}`}>
              {agent.status}
            </span>
          </div>
          
          {agent.output && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>JSON PAYLOAD</div>
              <pre className="code-block">
                {JSON.stringify(agent.output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ))}
      
      {!state && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '4rem' }}>
          <Activity size={32} style={{ opacity: 0.5, marginBottom: '1rem' }} />
          <p>Awaiting Trigger Event...</p>
        </div>
      )}
    </div>
  );
};
