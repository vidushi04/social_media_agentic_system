import React, { useEffect, useState, useRef } from 'react';
import { Search, Settings2, PlayCircle, Video } from 'lucide-react';
import type { OrchestratorState } from './agents/Orchestrator';
import { Orchestrator } from './agents/Orchestrator';
import { DevMode } from './components/DevMode';
import { Dashboard } from './components/Dashboard';
import { HistoryPanel } from './components/HistoryPanel';
import { SettingsModal } from './components/SettingsModal';
import { getAnalysisHistory } from './utils/knowledgeBase';

function App() {
  const [activeTab, setActiveTab] = useState<'latest' | 'history'>('latest');
  const [analysisHistory, setAnalysisHistory] = useState(getAnalysisHistory());
  const [url, setUrl] = useState('');
  const [youtubeKey, setYoutubeKey] = useState(localStorage.getItem('YOUTUBE_API_KEY') || '');
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('GEMINI_API_KEY') || '');
  const [isDevModeOpen, setIsDevModeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [orchestratorState, setOrchestratorState] = useState<OrchestratorState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [mockMode, setMockMode] = useState(() => {
    const stored = localStorage.getItem('MOCK_MODE');
    if (stored !== null) return stored === 'true';
    const hasKeys = Boolean(
      localStorage.getItem('YOUTUBE_API_KEY')?.trim() &&
      localStorage.getItem('GEMINI_API_KEY')?.trim()
    );
    return !hasKeys;
  });
  
  // Keep orchestrator instance
  const orchestratorRef = useRef<Orchestrator | null>(null);

  if (!orchestratorRef.current) {
    orchestratorRef.current = new Orchestrator((newState) => {
      setOrchestratorState(newState);
    });
  }

  useEffect(() => {
    setAnalysisHistory(getAnalysisHistory());
  }, []);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    if (!mockMode && (!youtubeKey.trim() || !geminiKey.trim())) {
      setIsSettingsOpen(true);
      return;
    }

    setErrorMsg('');
    setIsProcessing(true);
    try {
      await orchestratorRef.current?.processUrl(url, youtubeKey, geminiKey, mockMode);
      setAnalysisHistory(getAnalysisHistory());
      setActiveTab('latest');
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while processing the video. Please check the URL.');
    }
    setIsProcessing(false);
  };

  const getActiveAgentName = () => {
    if (!orchestratorState) return 'Initializing...';
    const runningAgent = Object.values(orchestratorState.agents).find(a => a.status === 'running');
    if (runningAgent) return `${runningAgent.name} is working...`;
    return 'Finalizing analysis...';
  };

  return (
    <>
      <div style={{ paddingBottom: '4rem' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '2rem', borderBottom: '1px solid var(--hairline)', marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'var(--primary)', padding: '0.5rem', borderRadius: 'var(--rounded-full)' }}>
              <Video color="white" size={24} />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary)' }}>
              Trellis
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--mute)' }}>
              Content Packaging Intelligence
            </div>
            <button className="btn-icon" onClick={() => setIsSettingsOpen(true)} title="API Settings">
              <Settings2 size={20} color="var(--ink)" />
            </button>
          </div>
        </header>

        <main>
          <div style={{ textAlign: 'center', marginBottom: '4rem', marginTop: '2rem' }}>
            <h1 style={{ fontSize: '4rem', marginBottom: '1rem', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              Deconstruct your content.<br />Understand your audience.
            </h1>
            <p style={{ fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto', color: 'var(--body)', marginTop: '1rem' }}>
              Paste a YouTube URL below. Our multi-agent pipeline will reverse-engineer the psychology of your hook and prescribe an actionable micro-skill.
            </p>
          </div>

          <form onSubmit={handleAnalyze} style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div className="feature-card-soft" style={{ display: 'flex', gap: '1rem', padding: '0.75rem', marginBottom: '1rem', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Search size={20} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--mute)' }} />
                  <input 
                    type="text" 
                    className="search-bar" 
                    placeholder="Search for a YouTube video URL..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isProcessing}
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={isProcessing || !url.trim()}>
                  {isProcessing ? 'Analyzing...' : <><PlayCircle size={18} /> Analyze</>}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div style={{ background: 'rgba(158, 10, 10, 0.05)', border: '1px solid var(--error)', color: 'var(--error)', padding: '1rem', borderRadius: 'var(--rounded-md)', marginBottom: '1rem', textAlign: 'left', animation: 'fadeIn 0.3s ease-out' }}>
                <strong>Error:</strong> {errorMsg}
              </div>
            )}

            {!isProcessing && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--mute)', display: 'flex', alignItems: 'center' }}>Quick Try:</span>
                <button type="button" className="chip" onClick={() => setUrl('https://www.youtube.com/watch?v=iGeXGdYE7UE')}>Tech Review (MKBHD)</button>
                <button type="button" className="chip" onClick={() => setUrl('https://www.youtube.com/watch?v=k8A0qPG0nag')}>EV Review</button>
                <button type="button" className="chip" onClick={() => setUrl('https://www.youtube.com/watch?v=0e3GPea1Tyg')}>MrBeast</button>
              </div>
            )}

            {isProcessing && (
              <div className="loading-state" style={{ marginTop: '2rem', animation: 'fadeIn 0.3s ease-out' }}>
                <div className="spinner"></div>
                <h3 style={{ margin: '1rem 0 0.5rem', color: 'var(--primary)', fontSize: '1.2rem' }}>Agentic Pipeline Active</h3>
                <p style={{ color: 'var(--mute)', margin: 0, fontSize: '1rem' }}>{getActiveAgentName()}</p>
              </div>
            )}
          </form>

          {!isProcessing && (orchestratorState?.finalSkill || analysisHistory.length > 0) && (
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem' }}>
                <button
                  type="button"
                  className={activeTab === 'latest' ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => setActiveTab('latest')}
                >
                  Latest Analysis
                </button>
                <button
                  type="button"
                  className={activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => setActiveTab('history')}
                >
                  History
                </button>
              </div>

              {activeTab === 'latest' ? (
                orchestratorState?.finalSkill ? (
                  <Dashboard
                    skillData={orchestratorState.finalSkill}
                    patternData={orchestratorState.agents.pattern.output}
                    onReset={() => { setUrl(''); setErrorMsg(''); setOrchestratorState(null); }}
                  />
                ) : (
                  <div className="feature-card" style={{ marginTop: '2rem' }}>
                    <h3 style={{ marginBottom: '0.5rem' }}>No current analysis</h3>
                    <p style={{ margin: 0, color: 'var(--mute)' }}>
                      Run a new analysis to see the latest recommendation here.
                    </p>
                  </div>
                )
              ) : (
                <HistoryPanel history={analysisHistory} />
              )}
            </div>
          )}
        </main>
      </div>

      <button className="dev-toggle" onClick={() => setIsDevModeOpen(!isDevModeOpen)} title="Toggle Dev Mode">
        <Settings2 size={24} color={isDevModeOpen ? 'var(--primary)' : 'var(--ink)'} />
      </button>

      <DevMode 
        isOpen={isDevModeOpen} 
        onClose={() => setIsDevModeOpen(false)} 
        state={orchestratorState}
        geminiKey={geminiKey}
        youtubeKey={youtubeKey}
      />

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        youtubeKey={youtubeKey}
        setYoutubeKey={setYoutubeKey}
        geminiKey={geminiKey}
        setGeminiKey={setGeminiKey}
        mockMode={mockMode}
        setMockMode={setMockMode}
      />
    </>
  );
}

export default App;
