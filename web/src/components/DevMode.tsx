import React from 'react';
import type { OrchestratorState, AgentState } from '../agents/Orchestrator';
import { Terminal, Database, Activity, CheckCircle2, Clock, Users, Search, BrainCircuit, Target, X } from 'lucide-react';

interface DevModeProps {
  isOpen: boolean;
  onClose: () => void;
  state: OrchestratorState | null;
}

const renderAgentOutput = (agentId: string, output: any) => {
  if (!output) return null;
  
  switch (agentId) {
    case 'data_collector':
      return (
        <div>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--on-dark)' }}>
            Extracted metadata for <strong>{output.title}</strong> by <strong>{output.channel}</strong>.
          </p>
          <div style={{ fontSize: '13px', color: 'var(--disabled)' }}>
            Processed {output.views} views, {output.likes} likes, and sampled top comments.
          </div>
        </div>
      );
    case 'deconstructor':
      return (
        <div>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--on-dark)' }}>
            <strong>Hook Identified:</strong> {output.hook_type || 'Custom'}
          </p>
          <div style={{ fontSize: '13px', color: 'var(--disabled)' }}>
            Visual: {output.visual_hook}<br/>
            Verbal: {output.verbal_hook}
          </div>
        </div>
      );
    case 'audience':
      return (
        <div>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--on-dark)' }}>
            <strong>Sentiment:</strong> {output.signal_type || 'Mixed'}
          </p>
          <div style={{ fontSize: '13px', color: 'var(--disabled)' }}>
            {output.core_desire && `Core Desire: ${output.core_desire}`}
          </div>
        </div>
      );
    case 'pattern':
      return (
        <div>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--on-dark)' }}>
            Detected a <strong>{output.pattern_type}</strong> in <strong>{output.craft_element}</strong>.
          </p>
          <div style={{ fontSize: '13px', color: 'var(--disabled)' }}>
            {output.observation}
          </div>
        </div>
      );
    case 'skill':
      return (
        <div>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--on-dark)' }}>
            <strong>Prescribed Micro-Skill:</strong>
          </p>
          <div style={{ fontSize: '16px', color: 'var(--primary)', fontWeight: 'bold' }}>
            {output.skill}
          </div>
        </div>
      );
    default:
      return (
        <pre className="code-block" style={{ margin: 0 }}>
          {JSON.stringify(output, null, 2)}
        </pre>
      );
  }
};

const AgentNode = ({ agent, icon: Icon }: { agent?: AgentState, icon: any }) => {
  if (!agent) return null;
  return (
    <div className={`agent-card ${agent.status}`}>
      <div className="agent-header">
        <Icon size={18} style={{ color: agent.status === 'running' ? 'var(--primary)' : 'inherit' }} />
        <span style={{ flex: 1 }}>{agent.name}</span>
        <span className="agent-status">{agent.status}</span>
      </div>
      {agent.status === 'running' && (
        <div style={{ color: 'var(--disabled)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={14} className="animate-pulse-glow" style={{ color: 'var(--primary)' }} /> Processing...
        </div>
      )}
      {agent.status === 'completed' && renderAgentOutput(agent.id, agent.output)}
      {agent.status === 'error' && (
        <div style={{ color: 'var(--error)', fontSize: '13px' }}>
          {agent.output?.error || 'Execution failed.'}
        </div>
      )}
    </div>
  );
};

export const DevMode: React.FC<DevModeProps> = ({ isOpen, onClose, state }) => {
  if (!isOpen) return null;

  const agents = state?.agents || {};

  return (
    <div className={`dev-overlay ${isOpen ? 'open' : ''}`}>
      <div className="flex-between" style={{ marginBottom: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.5rem', color: 'var(--on-dark)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          <Terminal size={24} /> System Visualization
        </h2>
        <button className="btn-icon" onClick={onClose} style={{ color: 'var(--on-dark)' }}>
          <X size={32} />
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '2rem', maxWidth: '1000px', margin: '0 auto 4rem auto' }}>
        <p style={{ fontSize: '1.1rem', color: 'var(--disabled)' }}>
          Real-time audience view of the multi-agent orchestration engine.
        </p>
      </div>

      {!state ? (
        <div style={{ textAlign: 'center', color: 'var(--disabled)', marginTop: '8rem' }}>
          <Activity size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
          <p style={{ fontSize: '1.2rem' }}>Awaiting Trigger Event...</p>
        </div>
      ) : (
        <div className="pipeline-graph">
          
          {/* Row 1: Data Collector */}
          <div className="pipeline-row">
            <AgentNode agent={agents.data_collector} icon={Database} />
          </div>

          {/* Row 2: Parallel Analysis (Deconstructor + Audience) */}
          <div className="pipeline-row">
            <div className={`edge split-vertical-top ${agents.deconstructor?.status !== 'idle' ? 'active' : ''}`}></div>
            <div className={`edge split-horizontal ${agents.deconstructor?.status !== 'idle' ? 'active' : ''}`}></div>
            
            <div className={`edge edge-arrow split-vertical-left ${agents.deconstructor?.status !== 'idle' ? 'active' : ''}`}></div>
            <AgentNode agent={agents.deconstructor} icon={Search} />
            
            <AgentNode agent={agents.audience} icon={Users} />
            <div className={`edge edge-arrow split-vertical-right ${agents.audience?.status !== 'idle' ? 'active' : ''}`}></div>
          </div>

          {/* Row 3: Pattern Detector */}
          <div className="pipeline-row">
            <div className={`edge merge-vertical-left ${agents.pattern?.status !== 'idle' ? 'active' : ''}`}></div>
            <div className={`edge merge-vertical-right ${agents.pattern?.status !== 'idle' ? 'active' : ''}`}></div>
            <div className={`edge merge-horizontal ${agents.pattern?.status !== 'idle' ? 'active' : ''}`}></div>
            <div className={`edge edge-arrow merge-vertical-bottom ${agents.pattern?.status !== 'idle' ? 'active' : ''}`}></div>

            <AgentNode agent={agents.pattern} icon={BrainCircuit} />
          </div>

          {/* Row 4: Coach */}
          <div className="pipeline-row">
            <div className={`edge edge-arrow direct-vertical ${agents.skill?.status !== 'idle' ? 'active' : ''}`}></div>
            <AgentNode agent={agents.skill} icon={Target} />
          </div>

        </div>
      )}
    </div>
  );
};
