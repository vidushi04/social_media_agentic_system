import React, { useEffect, useMemo, useState } from 'react';
import type { OrchestratorState, AgentState } from '../agents/Orchestrator';
import { Terminal, Database, Activity, Users, Search, BrainCircuit, Target, X, Copy } from 'lucide-react';
import {
  DECONSTRUCTOR_PROMPT,
  AUDIENCE_READER_PROMPT,
  PATTERN_DETECTOR_PROMPT,
  COACH_PROMPT
} from '../agents/prompts';
import {
  runContentDeconstructor,
  runAudienceSignalReader,
  runPatternDetector,
  runCoach
} from '../utils/llm';
import { fetchVideoComments, fetchVideoMetrics } from '../utils/youtube';

interface DevModeProps {
  isOpen: boolean;
  onClose: () => void;
  state: OrchestratorState | null;
  geminiKey: string;
  youtubeKey: string;
}

type TabKey = 'diagram' | 'configuration';
type SessionRecord = Record<string, { editedInput: string; expectedOutput: string; isLoading: boolean; error?: string }>;

const AGENT_ORDER = ['data_collector', 'deconstructor', 'audience', 'pattern', 'skill'];

const AGENT_CONFIG: Record<string, { prompt: string; knowledgeBase: { sources: string[]; scope: string; boundaries: string; access: string[] } }> = {
  data_collector: {
    prompt: 'This agent fetches metadata and audience comments from the YouTube Data API based on a video URL.',
    knowledgeBase: {
      sources: ['YouTube Data API responses'],
      scope: 'Video-level metadata and top comments for the target URL.',
      boundaries: 'No direct LLM interpretation. Only what the API returns for the selected video.',
      access: ['Title', 'Channel', 'Views/Likes/Comments', 'Description', 'Category', 'Tags', 'Top comments']
    }
  },
  deconstructor: {
    prompt: DECONSTRUCTOR_PROMPT.trim(),
    knowledgeBase: {
      sources: ['Video title, category, description, tags'],
      scope: 'Packaging craft and copywriting anatomy.',
      boundaries: 'Does not watch the raw video file. No recommendation behavior.',
      access: ['Metadata text from Data Collector output']
    }
  },
  audience: {
    prompt: AUDIENCE_READER_PROMPT.trim(),
    knowledgeBase: {
      sources: ['Recent video comments'],
      scope: 'Audience themes, shifts, and unmet needs.',
      boundaries: 'No topic recommendation. No sentiment scoring by individual comment.',
      access: ['Comment text list']
    }
  },
  pattern: {
    prompt: PATTERN_DETECTOR_PROMPT.trim(),
    knowledgeBase: {
      sources: ['Deconstructor output', 'Performance summary', 'Audience Reader output'],
      scope: 'Cross-agent synthesis into one actionable pattern signal.',
      boundaries: 'No prescription or external-attribution claims.',
      access: ['Structured outputs from prior agents']
    }
  },
  skill: {
    prompt: COACH_PROMPT.trim(),
    knowledgeBase: {
      sources: ['Pattern Detector output'],
      scope: 'One practical micro-skill for the next post cycle.',
      boundaries: 'Single-skill coaching only, tied directly to diagnosed pattern.',
      access: ['Pattern object fields']
    }
  }
};

const toDisplayLines = (data: any): string[] => {
  if (!data) return ['No data available yet.'];
  if (typeof data === 'string') return [data];
  if (Array.isArray(data)) return data.map((item, idx) => `${idx + 1}. ${String(item)}`);
  if (typeof data === 'object') {
    return Object.entries(data).map(([key, value]) => `${key.replace(/_/g, ' ')}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);
  }
  return [String(data)];
};

const toReadableText = (agentId: string, data: any, kind: 'input' | 'output'): string => {
  const lines = toDisplayLines(data);
  if (kind === 'input') return lines.map(line => `Input: ${line}`).join('\n');
  if (agentId === 'skill' && data?.skill) {
    return `Output: Recommended micro-skill is ${data.skill}.\nOutput: Why it matters: ${data.why_it_matters || 'No explanation yet.'}\nOutput: Try this next: ${data.try_this || 'No action suggestion yet.'}`;
  }
  return lines.map(line => `Output: ${line}`).join('\n');
};

const AgentNode = ({ agent, icon: Icon, isSelected, onSelect }: { agent?: AgentState, icon: any, isSelected: boolean, onSelect: () => void }) => {
  if (!agent) return null;
  return (
    <button type="button" className={`agent-card ${agent.status} ${isSelected ? 'selected' : ''}`} onClick={onSelect}>
      <div className="agent-header">
        <Icon size={18} style={{ color: agent.status === 'running' ? 'var(--primary)' : 'inherit' }} />
        <span style={{ flex: 1 }}>{agent.name}</span>
        <span className="agent-status">{agent.status}</span>
      </div>
      {agent.status === 'running' && (
        <div style={{ color: 'var(--mute)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={14} className="animate-pulse-glow" style={{ color: 'var(--primary)' }} /> Processing...
        </div>
      )}
      {agent.status === 'completed' && (
        <div>
          {toReadableText(agent.id, agent.output, 'output').split('\n').slice(0, 2).map((line, idx) => (
            <p key={`${agent.id}-summary-${idx}`} style={{ margin: '0 0 6px 0', fontSize: '13px', color: 'inherit' }}>
              {line}
            </p>
          ))}
        </div>
      )}
      {agent.status === 'error' && (
        <div style={{ color: 'var(--error)', fontSize: '13px' }}>
          {agent.output?.error || 'Execution failed.'}
        </div>
      )}
    </button>
  );
};

export const DevMode: React.FC<DevModeProps> = ({ isOpen, onClose, state, geminiKey, youtubeKey }) => {
  if (!isOpen) return null;

  const agents = state?.agents || {};
  const [activeTab, setActiveTab] = useState<TabKey>('diagram');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('data_collector');
  const [inspectorAgentId, setInspectorAgentId] = useState<string | null>(null);
  const [sessionEdits, setSessionEdits] = useState<SessionRecord>({});
  const selectedAgent = inspectorAgentId ? agents[inspectorAgentId] : undefined;

  useEffect(() => {
    if (!selectedAgent) return;
    setSessionEdits(prev => {
      if (prev[selectedAgent.id]) return prev;
      return {
        ...prev,
        [selectedAgent.id]: {
          editedInput: toReadableText(selectedAgent.id, selectedAgent.input, 'input'),
          expectedOutput: toReadableText(selectedAgent.id, selectedAgent.output, 'output'),
          isLoading: false
        }
      };
    });
  }, [selectedAgent]);

  const selectedEdit = inspectorAgentId ? sessionEdits[inspectorAgentId] : undefined;

  const rerunSelectedAgent = async (textInput: string) => {
    if (!selectedAgent) return;
    setSessionEdits(prev => ({
      ...prev,
      [selectedAgent.id]: { ...(prev[selectedAgent.id] || { editedInput: textInput, expectedOutput: '', isLoading: false }), editedInput: textInput, isLoading: true, error: undefined }
    }));
    try {
      let nextOutput: any = null;
      if (selectedAgent.id === 'data_collector') {
        const url = textInput.split('\n').map(s => s.trim()).find(s => s.startsWith('http')) || textInput.trim();
        const metrics = await fetchVideoMetrics(url, youtubeKey);
        const comments = await fetchVideoComments(url, youtubeKey);
        nextOutput = {
          title: metrics.title,
          channel: metrics.channelTitle,
          views: metrics.viewCount,
          likes: metrics.likeCount,
          comments: comments.length
        };
      } else if (selectedAgent.id === 'deconstructor') {
        nextOutput = await runContentDeconstructor(geminiKey, {
          title: textInput,
          categoryName: 'Edited in inspector',
          description: textInput,
          tags: []
        });
      } else if (selectedAgent.id === 'audience') {
        nextOutput = await runAudienceSignalReader(geminiKey, textInput.split('\n').filter(Boolean));
      } else if (selectedAgent.id === 'pattern') {
        nextOutput = await runPatternDetector(geminiKey, { observation: textInput }, { summary: textInput }, { observation: textInput });
      } else if (selectedAgent.id === 'skill') {
        nextOutput = await runCoach(geminiKey, { pattern_type: 'Edited', observation: textInput, craft_element: 'Edited input', actionable_pattern_found: true });
      }
      setSessionEdits(prev => ({
        ...prev,
        [selectedAgent.id]: {
          ...(prev[selectedAgent.id] || { editedInput: textInput, expectedOutput: '', isLoading: false }),
          editedInput: textInput,
          isLoading: false,
          expectedOutput: toReadableText(selectedAgent.id, nextOutput, 'output')
        }
      }));
    } catch (error: any) {
      setSessionEdits(prev => ({
        ...prev,
        [selectedAgent.id]: {
          ...(prev[selectedAgent.id] || { editedInput: textInput, expectedOutput: '', isLoading: false }),
          editedInput: textInput,
          isLoading: false,
          error: error?.message || 'Failed to compute expected output.'
        }
      }));
    }
  };

  const configAgentId = useMemo(() => selectedAgentId || AGENT_ORDER[0], [selectedAgentId]);
  const selectedAgentConfig = AGENT_CONFIG[configAgentId];

  return (
    <div className={`dev-overlay ${isOpen ? 'open' : ''}`}>
      <div className="flex-between" style={{ marginBottom: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.5rem', color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          <Terminal size={24} /> System Visualization
        </h2>
        <button className="btn-icon" onClick={onClose} style={{ color: 'var(--ink)' }}>
          <X size={32} />
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '2rem', maxWidth: '1000px', margin: '0 auto 4rem auto' }}>
        <p style={{ fontSize: '1.1rem', color: 'var(--mute)' }}>
          Real-time audience view of the multi-agent orchestration engine.
        </p>
      </div>
      <div style={{ maxWidth: '1200px', margin: '0 auto 1.5rem auto', display: 'flex', gap: '0.5rem' }}>
        <button type="button" className={activeTab === 'diagram' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('diagram')}>
          System Diagram
        </button>
        <button type="button" className={activeTab === 'configuration' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('configuration')}>
          Agent Configuration
        </button>
      </div>

      {activeTab === 'diagram' ? (
        !state ? (
          <div style={{ textAlign: 'center', color: 'var(--mute)', marginTop: '8rem' }}>
            <Activity size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <p style={{ fontSize: '1.2rem' }}>Awaiting Trigger Event...</p>
          </div>
        ) : (
        <div className="pipeline-graph">
          
          {/* Row 1: Data Collector */}
          <div className="pipeline-row">
            <AgentNode agent={agents.data_collector} icon={Database} isSelected={inspectorAgentId === 'data_collector'} onSelect={() => setInspectorAgentId('data_collector')} />
          </div>

          {/* Row 2: Parallel Analysis (Deconstructor + Audience) */}
          <div className="pipeline-row">
            <div className={`edge split-vertical-top ${agents.deconstructor?.status !== 'idle' ? 'active' : ''}`}></div>
            <div className={`edge split-horizontal ${agents.deconstructor?.status !== 'idle' ? 'active' : ''}`}></div>
            
            <div className={`edge edge-arrow split-vertical-left ${agents.deconstructor?.status !== 'idle' ? 'active' : ''}`}></div>
            <AgentNode agent={agents.deconstructor} icon={Search} isSelected={inspectorAgentId === 'deconstructor'} onSelect={() => setInspectorAgentId('deconstructor')} />
            
            <AgentNode agent={agents.audience} icon={Users} isSelected={inspectorAgentId === 'audience'} onSelect={() => setInspectorAgentId('audience')} />
            <div className={`edge edge-arrow split-vertical-right ${agents.audience?.status !== 'idle' ? 'active' : ''}`}></div>
          </div>

          {/* Row 3: Pattern Detector */}
          <div className="pipeline-row">
            <div className={`edge merge-vertical-left ${agents.pattern?.status !== 'idle' ? 'active' : ''}`}></div>
            <div className={`edge merge-vertical-right ${agents.pattern?.status !== 'idle' ? 'active' : ''}`}></div>
            <div className={`edge merge-horizontal ${agents.pattern?.status !== 'idle' ? 'active' : ''}`}></div>
            <div className={`edge edge-arrow merge-vertical-bottom ${agents.pattern?.status !== 'idle' ? 'active' : ''}`}></div>

            <AgentNode agent={agents.pattern} icon={BrainCircuit} isSelected={inspectorAgentId === 'pattern'} onSelect={() => setInspectorAgentId('pattern')} />
          </div>

          {/* Row 4: Coach */}
          <div className="pipeline-row">
            <div className={`edge edge-arrow direct-vertical ${agents.skill?.status !== 'idle' ? 'active' : ''}`}></div>
            <AgentNode agent={agents.skill} icon={Target} isSelected={inspectorAgentId === 'skill'} onSelect={() => setInspectorAgentId('skill')} />
          </div>
        </div>
        )
      ) : (
        <div className="dev-split-layout config-layout">
          <div className="config-list">
            {AGENT_ORDER.map(agentId => (
              <button key={agentId} type="button" className={`config-list-item ${configAgentId === agentId ? 'active' : ''}`} onClick={() => setSelectedAgentId(agentId)}>
                {agents[agentId]?.name || agentId}
              </button>
            ))}
          </div>
          <div className="config-details">
            <div className="inspector-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4>System Instructions / Prompt</h4>
                <button type="button" className="btn-secondary" onClick={() => navigator.clipboard.writeText(selectedAgentConfig.prompt)}>
                  <Copy size={14} /> Copy
                </button>
              </div>
              <pre className="config-monospace">{selectedAgentConfig.prompt}</pre>
            </div>
            <div className="inspector-section">
              <h4>Dedicated Knowledge Base</h4>
              <p className="inspector-line"><strong>Sources:</strong> {selectedAgentConfig.knowledgeBase.sources.join(', ')}</p>
              <p className="inspector-line"><strong>Scope:</strong> {selectedAgentConfig.knowledgeBase.scope}</p>
              <p className="inspector-line"><strong>Boundary:</strong> {selectedAgentConfig.knowledgeBase.boundaries}</p>
              <p className="inspector-line"><strong>Accessible Data:</strong> {selectedAgentConfig.knowledgeBase.access.join(', ')}</p>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'diagram' && inspectorAgentId && selectedAgent && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '880px' }}>
            <div className="flex-between">
              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--ink)' }}>
                Agent Inspector - {selectedAgent.name}
              </h3>
              <button className="btn-icon" onClick={() => setInspectorAgentId(null)}>
                <X size={24} />
              </button>
            </div>
            <p style={{ color: 'var(--mute)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              Test run output is generated by re-running the selected agent with the test input.
            </p>
            <div className="inspector-section">
              <h4>Current Input</h4>
              {toReadableText(inspectorAgentId, selectedAgent.input, 'input').split('\n').map((line, idx) => (
                <p key={`input-${idx}`} className="inspector-line">{line}</p>
              ))}
            </div>
            <div className="inspector-section">
              <h4>Current Output</h4>
              {toReadableText(inspectorAgentId, selectedAgent.output, 'output').split('\n').map((line, idx) => (
                <p key={`output-${idx}`} className="inspector-line">{line}</p>
              ))}
            </div>
            <div className="inspector-section">
              <h4>Test Input (Session Local)</h4>
              <textarea
                className="inspector-textarea"
                value={selectedEdit?.editedInput || ''}
                onChange={(e) => setSessionEdits(prev => ({
                  ...prev,
                  [inspectorAgentId]: {
                    ...(prev[inspectorAgentId] || { expectedOutput: '', isLoading: false }),
                    editedInput: e.target.value
                  }
                }))}
              />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button type="button" className="btn-primary" onClick={() => rerunSelectedAgent(selectedEdit?.editedInput || '')} disabled={!selectedEdit?.editedInput || selectedEdit?.isLoading}>
                  {selectedEdit?.isLoading ? 'Running...' : 'Run Agent with Test Input'}
                </button>
              </div>
              {selectedEdit?.error && <p style={{ color: 'var(--error)', marginTop: '0.5rem' }}>{selectedEdit.error}</p>}
            </div>
            <div className="inspector-section">
              <h4>Test Run Output</h4>
              {(selectedEdit?.expectedOutput || 'No expected output yet.').split('\n').map((line, idx) => (
                <p key={`expected-${idx}`} className="inspector-line">{line}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
