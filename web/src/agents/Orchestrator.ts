export type AgentStatus = 'idle' | 'running' | 'completed' | 'error';
import { fetchVideoMetrics, fetchVideoComments, formatNumber } from '../utils/youtube';
import { runContentDeconstructor, runAudienceSignalReader, runPatternDetector, runCoach } from '../utils/llm';

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

// No mock payloads, using real LLM

export class Orchestrator {
  private updateState: (state: OrchestratorState) => void;
  private state: OrchestratorState;

  constructor(updateState: (state: OrchestratorState) => void) {
    this.updateState = updateState;
    this.state = {
      agents: {
        interpreter: { id: 'interpreter', name: 'Data Harvester', status: 'idle' },
        deconstructor: { id: 'deconstructor', name: 'Content Deconstructor', status: 'idle' },
        audience: { id: 'audience', name: 'Audience Signal Reader', status: 'idle' },
        pattern: { id: 'pattern', name: 'Pattern Detector', status: 'idle' },
        skill: { id: 'skill', name: 'Coach', status: 'idle' },
      }
    };
  }

  private setAgentStatus(id: string, status: AgentStatus, output?: any) {
    this.state.agents[id] = { ...this.state.agents[id], status, output };
    this.updateState({ ...this.state });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async processUrl(url: string, youtubeKey: string, geminiKey: string, mockMode: boolean = false) {
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

    if (mockMode) {
      await this.delay(1500);
      this.setAgentStatus('interpreter', 'completed', { views: "1.2M", title: "Mock Video" });
      this.setAgentStatus('deconstructor', 'completed', { hook_type: "Curiosity Gap" });
      this.setAgentStatus('audience', 'completed', { signal_type: "Positive" });
      
      this.setAgentStatus('pattern', 'running');
      await this.delay(1500);
      const patternData = { actionable_pattern_found: true, pattern_type: "Weakness", craft_element: "Pacing", observation: "Viewers are dropping off during the mid-roll explanation." };
      this.setAgentStatus('pattern', 'completed', patternData);

      this.setAgentStatus('skill', 'running');
      await this.delay(1500);
      const skillData = { skill: "Dynamic Mid-roll Transitions", why_it_matters: "Keeps retention high during naturally slow sections.", try_this: "Add B-roll or a visual pattern interrupt right as you begin your explanation." };
      this.setAgentStatus('skill', 'completed', skillData);
      
      this.state.finalSkill = skillData;
      this.updateState({ ...this.state });
      return;
    }

    let interpreterPromise: Promise<any>;
    let metricsData: any = null;
    let commentsData: string[] = [];

    if (!youtubeKey) {
      this.setAgentStatus('interpreter', 'error', { error: 'YouTube API Key is required.' });
      interpreterPromise = Promise.reject('No YouTube Key');
    } else {
      interpreterPromise = fetchVideoMetrics(url, youtubeKey).then(async (metrics) => {
        metricsData = metrics;
        const output = {
          views: `${formatNumber(metrics.viewCount)}`,
          likes: `${formatNumber(metrics.likeCount)}`,
          comments: `${formatNumber(metrics.commentCount)}`,
          title: metrics.title,
          channel: metrics.channelTitle,
          category: metrics.categoryName,
          description: metrics.description ? metrics.description.substring(0, 100) + '...' : '',
          tags: metrics.tags,
        };
        this.setAgentStatus('interpreter', 'completed', output);
        
        // Also fetch comments for the Audience Signal Reader
        commentsData = await fetchVideoComments(url, youtubeKey);
        return output;
      }).catch(err => {
        this.setAgentStatus('interpreter', 'error', { error: err.message });
        throw err;
      });
    }

    let deconstructorPromise: Promise<any>;
    let audiencePromise: Promise<any>;

    if (!geminiKey) {
      this.setAgentStatus('deconstructor', 'error', { error: 'Gemini API Key is required.' });
      this.setAgentStatus('audience', 'error', { error: 'Gemini API Key is required.' });
      deconstructorPromise = Promise.reject('No Gemini Key');
      audiencePromise = Promise.reject('No Gemini Key');
    } else {
      // The deconstructor and audience reader need data from the interpreter phase first in this real setup
      // So we must wait for interpreterPromise to resolve to get the title, category, and comments.
      deconstructorPromise = interpreterPromise.then(() => {
        return runContentDeconstructor(geminiKey, metricsData).then(output => {
          this.setAgentStatus('deconstructor', 'completed', output);
          return output;
        }).catch(err => {
          this.setAgentStatus('deconstructor', 'error', { error: err.message });
          throw err;
        });
      });

      audiencePromise = interpreterPromise.then(async () => {
        // Stagger this request by 2 seconds to avoid hitting the Gemini Free Tier burst rate limit (429 error)
        await this.delay(2000); 
        return runAudienceSignalReader(geminiKey, commentsData).then(output => {
          this.setAgentStatus('audience', 'completed', output);
          return output;
        }).catch(err => {
          this.setAgentStatus('audience', 'error', { error: err.message });
          throw err;
        });
      });
    }

    try {
      const [deconstructorData, interpreterData, audienceData] = await Promise.all([
        deconstructorPromise,
        interpreterPromise,
        audiencePromise
      ]);

      // Checkpoint: Pattern Detector
      this.setAgentStatus('pattern', 'running');
      const patternData = await runPatternDetector(geminiKey, deconstructorData, interpreterData, audienceData);
      this.setAgentStatus('pattern', 'completed', patternData);

      // Conditional: Skill Coach
      if (patternData.actionable_pattern_found) {
        this.setAgentStatus('skill', 'running');
        const skillData = await runCoach(geminiKey, patternData);
        this.setAgentStatus('skill', 'completed', skillData);
        this.state.finalSkill = skillData;
        this.updateState({ ...this.state });
      }

    } catch (e: any) {
      console.error("Orchestration halted due to agent error", e);
      throw new Error(e.message || 'Failed to process URL. Please check if the video exists and is public.');
    }
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
