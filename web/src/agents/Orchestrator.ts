export type AgentStatus = 'idle' | 'running' | 'completed' | 'error';
import { fetchVideoMetrics, formatNumber } from '../utils/youtube';

export interface AgentState {
  id: string;
  name: string;
  status: AgentStatus;
  output?: any;
}

export interface OrchestratorState {
  agents: Record<string, AgentState>;
  finalSkill?: any;
}

// Mock Data Payloads (for agents pending LLM integration)
const mockDeconstructorOutput = {
  hook_type: "direct_address",
  pacing_style: "fast_cuts",
  cta_placement: "end_screen",
  cta_specificity: "generic"
};

const mockAudienceOutput = {
  signal_type: "Emerging Theme",
  observation: "In your last 4 videos, 7 comments asked about your specific Figma workflow.",
  confidence: "Strong"
};

const mockPatternOutput = {
  pattern_type: "Weakness",
  observation: "In 5 of your last 8 videos, the end screen CTA uses a generic 'Subscribe for more' phrasing.",
  craft_element: "CTA specificity",
  actionable_pattern_found: true
};

const mockSkillOutput = {
  skill: "Contextual CTA",
  why_it_matters: "Tying the call-to-action to specific value delivered in the video improves conversion.",
  try_this: "In your next video, replace 'Subscribe for more' with a CTA that previews the specific topic of your next upload."
};

export class MockOrchestrator {
  private updateState: (state: OrchestratorState) => void;
  private state: OrchestratorState;

  constructor(updateState: (state: OrchestratorState) => void) {
    this.updateState = updateState;
    this.state = {
      agents: {
        deconstructor: { id: 'deconstructor', name: 'Content Deconstructor', status: 'idle' },
        interpreter: { id: 'interpreter', name: 'Performance Interpreter', status: 'idle' },
        audience: { id: 'audience', name: 'Audience Signal Reader', status: 'idle' },
        pattern: { id: 'pattern', name: 'Pattern Detector', status: 'idle' },
        skill: { id: 'skill', name: 'Skill Coach', status: 'idle' },
      }
    };
  }

  private setAgentStatus(id: string, status: AgentStatus, output?: any) {
    this.state.agents[id] = { ...this.state.agents[id], status, output };
    this.updateState({ ...this.state });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async processUrl(url: string, apiKey: string) {
    // Reset state
    Object.keys(this.state.agents).forEach(key => {
      this.state.agents[key].status = 'idle';
      this.state.agents[key].output = undefined;
    });
    this.state.finalSkill = undefined;
    this.updateState({ ...this.state });

    // Parallel Phase
    this.setAgentStatus('deconstructor', 'running');
    this.setAgentStatus('interpreter', 'running');
    this.setAgentStatus('audience', 'running');

    let interpreterPromise: Promise<void>;
    if (!apiKey) {
      this.setAgentStatus('interpreter', 'error', { error: 'API Key is required.' });
      interpreterPromise = Promise.resolve();
    } else {
      interpreterPromise = fetchVideoMetrics(url, apiKey).then(metrics => {
        const output = {
          views: `${formatNumber(metrics.viewCount)}`,
          likes: `${formatNumber(metrics.likeCount)}`,
          comments: `${formatNumber(metrics.commentCount)}`,
          title: metrics.title,
          channel: metrics.channelTitle,
          category: metrics.categoryName,
          key_signal: "Strong hook retention, but sharp drop-off at the end screen. (Mock signal overlay on real data)",
          anomaly: true
        };
        this.setAgentStatus('interpreter', 'completed', output);
      }).catch(err => {
        this.setAgentStatus('interpreter', 'error', { error: err.message });
      });
    }

    await Promise.all([
      this.delay(1500).then(() => this.setAgentStatus('deconstructor', 'completed', mockDeconstructorOutput)),
      interpreterPromise,
      this.delay(1200).then(() => this.setAgentStatus('audience', 'completed', mockAudienceOutput)),
    ]);

    // Checkpoint: Pattern Detector waits for the first 3
    this.setAgentStatus('pattern', 'running');
    await this.delay(1800);
    this.setAgentStatus('pattern', 'completed', mockPatternOutput);

    // Conditional: Skill Coach
    if (mockPatternOutput.actionable_pattern_found) {
      this.setAgentStatus('skill', 'running');
      await this.delay(1500);
      this.setAgentStatus('skill', 'completed', mockSkillOutput);
      this.state.finalSkill = mockSkillOutput;
      this.updateState({ ...this.state });
    }
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
