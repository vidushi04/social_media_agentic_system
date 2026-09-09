import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { Search, Menu, BarChart3, PlaySquare, Users, User, MessageSquare, LogOut } from 'lucide-react';
import type { OrchestratorState } from './agents/Orchestrator';
import { Orchestrator } from './agents/Orchestrator';
import { DevMode } from './components/DevMode';
import { Dashboard } from './components/Dashboard';
import { HistoryPanel } from './components/HistoryPanel';
import { LoginScreen } from './components/LoginScreen';
import { AccessGateScreen } from './components/AccessGateScreen';
import { YoutubeHandlePrompt } from './components/YoutubeHandlePrompt';
import { FeedbackModal } from './components/FeedbackModal';
import { FeatureOnboardingModal } from './components/FeatureOnboardingModal';
import { getAnalysisHistory, deleteAnalysisFromHistory, type AnalysisRecord } from './utils/knowledgeBase';
import { fetchAppSettings } from './utils/appSettings';
import {
  persistOnboardingStatus,
  shouldShowGuestOnboarding,
  shouldShowProfileOnboarding,
} from './utils/onboarding';
import { useAuth } from './auth/AuthContext';
import emptyAnalysisIllustration from './assets/no-current-analysis.svg';

type View = 'dashboard' | 'history' | 'agents';

// Production API keys never reach the browser: without manually entered keys,
// all YouTube/Gemini calls go through the /api serverless proxies, which read
// YOUTUBE_API_KEY and GEMINI_API_KEY from server-side env vars.

// Set to true to show the sidebar "Send feedback" item.
const SHOW_SEND_FEEDBACK = true;

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

function App() {
  const { loading: authLoading, isLocalMode, user, profile, profileReady, isAccessApproved, signOut, refreshProfile } = useAuth();
  const [view, setView] = useState<View>('dashboard');
  const isMobileView = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth > 900
  );
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisRecord[]>([]);
  const [url, setUrl] = useState('');
  const [orchestratorState, setOrchestratorState] = useState<OrchestratorState | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<AnalysisRecord | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [onboardingClosed, setOnboardingClosed] = useState(false);

  const orchestratorRef = useRef<Orchestrator | null>(null);

  if (!orchestratorRef.current) {
    orchestratorRef.current = new Orchestrator((newState) => {
      setOrchestratorState(newState);
    });
  }

  useEffect(() => {
    if (authLoading) return;
    getAnalysisHistory().then(setAnalysisHistory);
    if (!user) {
      setOrchestratorState(null);
      setSelectedHistory(null);
    }
  }, [authLoading, user?.id]);

  useEffect(() => {
    setOnboardingClosed(false);
  }, [user?.id, isLocalMode]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setErrorMsg('');
    setSelectedHistory(null);
    setIsProcessing(true);
    try {
      const settings = await fetchAppSettings();
      await orchestratorRef.current?.processUrl(url, '', '', settings.mock_mode_enabled);
      setAnalysisHistory(await getAnalysisHistory());
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

  const handleResetToEmptyState = () => {
    setUrl('');
    setErrorMsg('');
    setSelectedHistory(null);
    setOrchestratorState(null);
    setView('dashboard');
    if (isMobileView) setIsSidebarOpen(false);
  };

  const navigateTo = (nextView: View) => {
    setView(nextView);
    if (isMobileView) setIsSidebarOpen(false);
  };

  const handleSelectHistory = (entry: AnalysisRecord) => {
    setSelectedHistory(entry);
    setUrl(entry.videoUrl);
    setView('dashboard');
  };

  const handleDeleteHistory = async (entry: AnalysisRecord) => {
    const title = entry.dataCollector?.title || entry.videoUrl;
    if (!window.confirm(`Delete the analysis of "${title}"? This cannot be undone.`)) return;
    await deleteAnalysisFromHistory(entry.id);
    setAnalysisHistory(await getAnalysisHistory());
    if (selectedHistory?.id === entry.id) {
      setSelectedHistory(null);
    }
  };

  const finishOnboarding = async (status: 'completed' | 'skipped') => {
    setOnboardingClosed(true);
    await persistOnboardingStatus({
      status,
      isLocalMode,
      userId: user?.id,
    });
    if (!isLocalMode) {
      await refreshProfile();
    }
  };

  const needsOnboarding = isLocalMode
    ? shouldShowGuestOnboarding()
    : Boolean(profile && isAccessApproved && shouldShowProfileOnboarding(profile));
  const showOnboarding = needsOnboarding && !onboardingClosed;

  if (authLoading) {
    return (
      <div className="studio-app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isLocalMode && !user) {
    return <LoginScreen />;
  }

  if (!isLocalMode && user && profile && !isAccessApproved) {
    return <AccessGateScreen status={profile.access_status} email={profile.email} />;
  }

  if (!isLocalMode && user && !profileReady) {
    return (
      <div className="studio-app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!isLocalMode && user && profileReady && !profile) {
    return (
      <div className="studio-app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="modal-content" style={{ maxWidth: '420px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.1rem', color: 'var(--ink)', margin: '0 0 0.75rem' }}>Could not load your profile</h2>
          <p style={{ color: 'var(--mute)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            You are signed in, but your account profile could not be loaded. Try signing out and back in.
          </p>
          <button type="button" className="btn-secondary" style={{ marginTop: '1.25rem' }} onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="studio-app">
        <FeatureOnboardingModal
          isOpen
          onComplete={() => { void finishOnboarding('completed'); }}
          onSkip={() => { void finishOnboarding('skipped'); }}
        />
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
    <div className="studio-app">
      <YoutubeHandlePrompt />
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        userId={!isLocalMode ? user?.id : undefined}
        userEmail={!isLocalMode ? (profile?.email || user?.email || undefined) : undefined}
      />
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
          <button
            type="button"
            className="studio-logo studio-logo-btn"
            onClick={handleResetToEmptyState}
            aria-label="Start a new analysis"
          >
            Trellis
          </button>
        </div>
        <div className="studio-topbar-spacer" />
        <div className="studio-search">
          <Search size={20} />
          <span>Search across your channel</span>
        </div>
        <div className="studio-topbar-spacer" />
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
            <p className="studio-channel-name">
              {isLocalMode ? 'Local mode' : profile?.youtube_username || user?.email || 'Your channel'}
            </p>
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
            {SHOW_SEND_FEEDBACK && (
              <button className="studio-nav-item" type="button" onClick={() => setIsFeedbackOpen(true)}>
                <MessageSquare size={24} />
                Send feedback
              </button>
            )}
            {!isLocalMode && (
              <button className="studio-nav-item" type="button" onClick={signOut}>
                <LogOut size={24} />
                Sign out
              </button>
            )}
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
                {isProcessing ? (
                  <div className="loading-state" style={{ flex: 1, animation: 'fadeIn 0.3s ease-out' }}>
                    <div className="spinner"></div>
                    <h3 style={{ margin: '1rem 0 0.5rem', fontSize: '1.2rem' }} className="studio-gradient-text">Agentic Pipeline Active</h3>
                    <p style={{ color: 'var(--studio-mute)', margin: 0, fontSize: '1rem' }}>{getActiveAgentName()}</p>
                  </div>
                ) : activeSkill ? (
                  <>
                    <h3 className="studio-perf-title">Latest video performance</h3>
                    <Dashboard
                      skillData={activeSkill}
                      patternData={activePattern}
                      videoMetrics={activeMetrics}
                      videoUrl={activeVideoUrl}
                      topContent={topContent}
                      onReset={handleResetToEmptyState}
                      onGoToAgents={() => setView('agents')}
                    />
                  </>
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
              geminiKey=""
              youtubeKey=""
            />
          )}
          </motion.div>
        </main>
      </div>
    </div>
    </MotionConfig>
  );
}

export default App;
