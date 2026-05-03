export type AgentStatus = 'idle' | 'running' | 'completed' | 'error';
import { fetchVideoMetrics, fetchVideoComments, formatNumber } from '../utils/youtube';
import { runContentDeconstructor, runAudienceSignalReader, runPatternDetector, runSkillCoach } from '../utils/llm';

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
  async processUrl(url: string, youtubeKey: string, geminiKey: string) {
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
      const [deconstructorData, interpreterData] = await Promise.all([
        deconstructorPromise,
        interpreterPromise,
        audiencePromise
      ]);

      // Checkpoint: Pattern Detector
      this.setAgentStatus('pattern', 'running');
      const patternData = await runPatternDetector(geminiKey, deconstructorData, interpreterData);
      this.setAgentStatus('pattern', 'completed', patternData);

      // Conditional: Skill Coach
      if (patternData.actionable_pattern_found) {
        this.setAgentStatus('skill', 'running');
        const skillData = await runSkillCoach(geminiKey, patternData);
        this.setAgentStatus('skill', 'completed', skillData);
        this.state.finalSkill = skillData;
        this.updateState({ ...this.state });
      }

    } catch (e) {
      console.error("Orchestration halted due to agent error", e);
    }
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
