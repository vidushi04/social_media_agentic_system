import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { Search, Menu, Video, BarChart3, PlaySquare, Users, Plus, ChevronRight, MoreVertical, User, Settings, MessageSquare } from 'lucide-react';
import type { OrchestratorState } from './agents/Orchestrator';
import { Orchestrator } from './agents/Orchestrator';
import { DevMode } from './components/DevMode';
import { Dashboard } from './components/Dashboard';
import { HistoryPanel } from './components/HistoryPanel';
import { SettingsModal } from './components/SettingsModal';
import { getAnalysisHistory, deleteAnalysisFromHistory, type AnalysisRecord } from './utils/knowledgeBase';
import emptyAnalysisIllustration from './assets/analyze-data.png';

type View = 'dashboard' | 'history' | 'agents';

// Production API keys never reach the browser: without manually entered keys,
// all YouTube/Gemini calls go through the /api serverless proxies, which read
// YOUTUBE_API_KEY and GEMINI_API_KEY from server-side env vars.

// Temporarily hidden for the final version — flip to true to bring the topbar
// "Api Config" button back.
const SHOW_API_CONFIG_BUTTON = false;

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isMobile;
};

const QUICK_TRY = [
  { label: 'Mr. Beast', url: 'https://www.youtube.com/watch?v=0e3GPea1Tyg' },
  { label: 'MKBHD Latest review', url: 'https://www.youtube.com/watch?v=iGeXGdYE7UE' },
  { label: 'EV Car Review', url: 'https://www.youtube.com/watch?v=k8A0qPG0nag' },
  { label: 'Art School Adm', url: 'https://www.youtube.com/watch?v=iGeXGdYE7UE' },
];

function App() {
  const [view, setView] = useState<View>('dashboard');
  const isMobileView = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth > 900
  );
  const [analysisHistory, setAnalysisHistory] = useState(getAnalysisHistory());
  const [url, setUrl] = useState('');
  const [youtubeKey, setYoutubeKey] = useState(localStorage.getItem('YOUTUBE_API_KEY') || '');
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('GEMINI_API_KEY') || '');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [orchestratorState, setOrchestratorState] = useState<OrchestratorState | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<AnalysisRecord | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [mockMode, setMockMode] = useState(() => {
    // Default to real analyses (served via the /api key proxies); the stored
    // flag lets the settings modal re-enable mock mode for development.
    const stored = localStorage.getItem('MOCK_MODE');
    return stored === 'true';
  });

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

    setErrorMsg('');
    setSelectedHistory(null);
    setIsProcessing(true);
    try {
      await orchestratorRef.current?.processUrl(url, youtubeKey, geminiKey, mockMode);
      setAnalysisHistory(getAnalysisHistory());
      setView('dashboard');
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

  const activeSkill = selectedHistory?.coach || orchestratorState?.finalSkill;
  const activePattern = selectedHistory?.pattern || orchestratorState?.agents.pattern.output;
  const activeMetrics = selectedHistory?.dataCollector || orchestratorState?.agents.data_collector.output;
  const activeVideoUrl = selectedHistory?.videoUrl || url;

  const topContent = [...analysisHistory]
    .reverse()
    .slice(0, 3)
    .map((entry) => ({
      title: entry.dataCollector?.title || entry.videoUrl,
      views: entry.dataCollector?.views ?? '—',
    }));

  const navigateTo = (nextView: View) => {
    setView(nextView);
    if (isMobileView) setIsSidebarOpen(false);
  };

  const openSettings = () => {
    setIsSettingsOpen(true);
    if (isMobileView) setIsSidebarOpen(false);
  };

  const handleSelectHistory = (entry: AnalysisRecord) => {
    setSelectedHistory(entry);
    setUrl(entry.videoUrl);
    setView('dashboard');
  };

  const handleDeleteHistory = (entry: AnalysisRecord) => {
    const title = entry.dataCollector?.title || entry.videoUrl;
    if (!window.confirm(`Delete the analysis of "${title}"? This cannot be undone.`)) return;
    deleteAnalysisFromHistory(entry.timestamp);
    setAnalysisHistory(getAnalysisHistory());
    if (selectedHistory?.timestamp === entry.timestamp) {
      setSelectedHistory(null);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
    <div className="studio-app">
      <header className="studio-topbar">
        <div className="studio-topbar-left">
          <button
            type="button"
            className="studio-menu-btn"
            aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setIsSidebarOpen((open) => !open)}
          >
            <Menu size={24} />
          </button>
          <h1 className="studio-logo">Trellis</h1>
        </div>
        <div className="studio-topbar-spacer" />
        <div className="studio-search">
          <Search size={20} />
          <span>Search across your channel</span>
        </div>
        <div className="studio-topbar-spacer" />
        {SHOW_API_CONFIG_BUTTON && (
          <button className="studio-create-btn" onClick={() => setIsSettingsOpen(true)} title="API Settings">
            <Video size={22} />
            Api Config
          </button>
        )}
        <div className="studio-avatar" />
      </header>

      <div className="studio-body">
        <AnimatePresence initial={false}>
        {isSidebarOpen && isMobileView && (
          <motion.div
            key="sidebar-scrim"
            className="studio-sidebar-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        {isSidebarOpen && (
        <motion.aside
          key="sidebar"
          className="studio-sidebar open"
          initial={isMobileView ? { x: '-100%' } : { x: -24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={isMobileView ? { x: '-100%' } : { x: -24, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="studio-channel">
            <div className="studio-channel-avatar">
              <User size={48} />
            </div>
            <p className="studio-channel-label">Your channel</p>
            <p className="studio-channel-name">Vidushi Bissa</p>
          </div>
          <nav className="studio-nav">
            <button
              className={`studio-nav-item ${view === 'dashboard' ? 'active' : ''}`}
              onClick={() => navigateTo('dashboard')}
            >
              <BarChart3 size={24} />
              Dashboard
            </button>
            <button
              className={`studio-nav-item ${view === 'history' ? 'active' : ''}`}
              onClick={() => navigateTo('history')}
            >
              <PlaySquare size={24} />
              Past Analysis
            </button>
            <button
              className={`studio-nav-item ${view === 'agents' ? 'active' : ''}`}
              onClick={() => navigateTo('agents')}
            >
              <Users size={24} />
              Agents
            </button>
          </nav>
          <div className="studio-sidebar-spacer" />
          <nav className="studio-nav studio-nav-bottom">
            <button className="studio-nav-item" onClick={openSettings}>
              <Settings size={24} />
              Settings
            </button>
            <button className="studio-nav-item" type="button">
              <MessageSquare size={24} />
              Send feedback
            </button>
          </nav>
        </motion.aside>
        )}
        </AnimatePresence>

        <main className="studio-content">
          <motion.div
            key={view}
            className="studio-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
          {view === 'dashboard' && (
            <>
              <div className="studio-page-header">
                <h2 className="studio-page-title">Channel dashboard</h2>
                <p className="studio-page-tagline">
                  <span className="studio-gradient-text">Understand your audience</span>
                  <span className="studio-tagline-dot">•</span>
                  <span className="studio-gradient-text">Improve Engagement</span>
                </p>
                <p className="studio-disclaimer">
                  Paste a YouTube URL below. Trellis multi-agent pipeline will help you reverse-engineer the psychology of your hook and prescribe an actionable micro-skill.
                </p>
              </div>

              <form onSubmit={handleAnalyze} className="studio-prompt-card">
                <div className="studio-prompt-row">
                  <input
                    type="text"
                    className="studio-prompt-input"
                    placeholder="Paste Your Video link here for analysis"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isProcessing}
                  />
                  <button type="submit" className="btn-gradient" disabled={isProcessing || !url.trim()}>
                    {isProcessing ? 'Analyzing...' : 'Analyze'}
                  </button>
                </div>
                <div>
                  <div className="studio-chips-row" style={{ marginBottom: '18px' }}>
                    <button type="button" className="studio-add-btn" title="Add a quick-try link">
                      <Plus size={14} />
                    </button>
                    {QUICK_TRY.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        className="studio-chip"
                        onClick={() => setUrl(item.url)}
                        disabled={isProcessing}
                      >
                        {item.label}
                      </button>
                    ))}
                    <ChevronRight size={16} color="var(--studio-mute)" />
                    <MoreVertical size={16} color="var(--studio-mute)" />
                  </div>
                  <p className="studio-fineprint">
                    <span className="mute">AI can make mistakes. Please double check. Use discretion before you create or use ideas.</span>
                    <span className="link">Learn more</span>
                  </p>
                </div>
              </form>

              {errorMsg && (
                <div className="studio-error">
                  <strong>Error:</strong> {errorMsg}
                </div>
              )}

              <div className="studio-perf-card">
                <h3 className="studio-perf-title">Latest video performance</h3>
                {isProcessing ? (
                  <div className="loading-state" style={{ flex: 1, animation: 'fadeIn 0.3s ease-out' }}>
                    <div className="spinner"></div>
                    <h3 style={{ margin: '1rem 0 0.5rem', fontSize: '1.2rem' }} className="studio-gradient-text">Agentic Pipeline Active</h3>
                    <p style={{ color: 'var(--studio-mute)', margin: 0, fontSize: '1rem' }}>{getActiveAgentName()}</p>
                  </div>
                ) : activeSkill ? (
                  <Dashboard
                    skillData={activeSkill}
                    patternData={activePattern}
                    videoMetrics={activeMetrics}
                    videoUrl={activeVideoUrl}
                    topContent={topContent}
                    onReset={() => {
                      setUrl('');
                      setErrorMsg('');
                      setSelectedHistory(null);
                      setOrchestratorState(null);
                    }}
                    onGoToAgents={() => setView('agents')}
                  />
                ) : (
                  <div className="studio-empty-state">
                    <div className="studio-empty-illustration">
                      <img className="base" src={emptyAnalysisIllustration} alt="" />
                    </div>
                    <div className="studio-empty-text">
                      <p className="studio-empty-title">No current analysis</p>
                      <p className="studio-empty-sub">Run a new analysis to see the latest recommendation here.</p>
                    </div>
                  </div>
                )}
              </div>

              <HistoryPanel
                history={analysisHistory}
                compact
                initialLimit={3}
                onSelect={handleSelectHistory}
              />
            </>
          )}

          {view === 'history' && (
            <>
              <div className="studio-page-header">
                <h2 className="studio-page-title">Past Analysis</h2>
                <p className="studio-disclaimer">
                  Every analysis you run is saved here as personalized creator memory.
                </p>
              </div>
              <HistoryPanel history={analysisHistory} onSelect={handleSelectHistory} onDelete={handleDeleteHistory} />
            </>
          )}

          {view === 'agents' && (
            <DevMode
              isOpen
              inline
              onClose={() => setView('dashboard')}
              state={orchestratorState}
              geminiKey={geminiKey}
              youtubeKey={youtubeKey}
            />
          )}
          </motion.div>
        </main>
      </div>

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
    </div>
    </MotionConfig>
  );
}

export default App;
