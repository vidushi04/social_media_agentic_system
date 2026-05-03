import React from 'react';
import type { OrchestratorState } from '../agents/Orchestrator';
import { Terminal, Activity, CheckCircle2, Clock, Database } from 'lucide-react';

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
        <p style={{ fontSize: '0.9rem', color: 'var(--body)' }}>
          Real-time visualization of the multi-agent orchestration engine.
        </p>
      </div>

      {state && Object.values(state.agents).map((agent) => (
        <div key={agent.id} className={`agent-card ${agent.id === 'interpreter' ? 'pipeline-stage' : ''}`}>
          <div className="agent-header">
            {agent.status === 'running' && (agent.id === 'interpreter' ? <Database size={16} style={{ color: 'var(--focus-outer)' }} /> : <Activity size={16} style={{ color: '#854d0e' }} />)}
            {agent.status === 'completed' && <CheckCircle2 size={16} style={{ color: 'var(--success-deep)' }} />}
            {agent.status === 'idle' && <Clock size={16} style={{ color: 'var(--mute)' }} />}
            <span style={{ color: 'var(--ink)' }}>{agent.name}</span>
            {agent.id === 'interpreter' && (
              <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', background: '#eef2ff', color: 'var(--focus-outer)', borderRadius: '4px', marginLeft: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px', border: '1px solid #c7d2fe' }}>
                Data Pipeline
              </span>
            )}
            <span style={{ marginLeft: 'auto' }} className={`agent-status ${agent.status}`}>
              {agent.status}
            </span>
          </div>
          
          {agent.output && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--mute)', marginBottom: '0.25rem' }}>JSON PAYLOAD</div>
              <pre className="code-block">
                {JSON.stringify(agent.output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ))}
      
      {!state && (
        <div style={{ textAlign: 'center', color: 'var(--mute)', marginTop: '4rem' }}>
          <Activity size={32} style={{ opacity: 0.5, marginBottom: '1rem' }} />
          <p>Awaiting Trigger Event...</p>
        </div>
      )}
    </div>
  );
};
