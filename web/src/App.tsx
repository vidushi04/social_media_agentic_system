import React, { useState, useRef } from 'react';
import { Search, Settings2, PlayCircle, Video } from 'lucide-react';
import type { OrchestratorState } from './agents/Orchestrator';
import { MockOrchestrator } from './agents/Orchestrator';
import { DevMode } from './components/DevMode';
import { Dashboard } from './components/Dashboard';

function App() {
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState(localStorage.getItem('YOUTUBE_API_KEY') || '');
  const [isDevModeOpen, setIsDevModeOpen] = useState(false);
  const [orchestratorState, setOrchestratorState] = useState<OrchestratorState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Keep orchestrator instance
  const orchestratorRef = useRef<MockOrchestrator | null>(null);

  if (!orchestratorRef.current) {
    orchestratorRef.current = new MockOrchestrator((newState) => {
      setOrchestratorState(newState);
    });
  }

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !apiKey.trim()) return;
    
    localStorage.setItem('YOUTUBE_API_KEY', apiKey);

    setIsProcessing(true);
    setIsDevModeOpen(true); // Auto-open dev mode to show the process
    await orchestratorRef.current?.processUrl(url, apiKey);
    setIsProcessing(false);
  };

  return (
    <>
      <div style={{ paddingBottom: '4rem' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '2rem', borderBottom: '1px solid var(--glass-border)', marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'var(--accent-gradient)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
              <Video color="white" size={24} />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', background: 'none', WebkitTextFillColor: 'var(--text-primary)' }}>
              Content Mirror
            </h1>
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Zero-to-1000 Followers System
          </div>
        </header>

        <main>
          <div style={{ textAlign: 'center', marginBottom: '4rem', marginTop: '2rem' }}>
            <h1 style={{ fontSize: '4rem', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
              Level up your<br />creator journey.
            </h1>
            <p style={{ fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto', color: 'var(--text-secondary)' }}>
              Paste your latest YouTube video URL below. Our agentic system will analyze your craft, interpret your metrics, and teach you the next micro-skill.
            </p>
          </div>

          <form onSubmit={handleAnalyze} style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div className="glass-panel" style={{ display: 'flex', gap: '1rem', padding: '0.75rem', marginBottom: '1rem', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="premium-input" 
                    placeholder="https://youtube.com/watch?v=..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    style={{ paddingLeft: '3rem', border: 'none', background: 'rgba(0, 0, 0, 0.4)', boxShadow: 'none' }}
                    disabled={isProcessing}
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={isProcessing || !url.trim() || !apiKey.trim()}>
                  {isProcessing ? 'Analyzing...' : <><PlayCircle size={18} /> Analyze</>}
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>YouTube API Key <span style={{color: 'var(--error)'}}>*</span>:</label>
                <input 
                  type="password" 
                  required
                  value={apiKey} 
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="Enter your API Key to fetch live data" 
                  style={{ background: 'transparent', border: '1px solid var(--glass-border)', padding: '0.3rem 0.5rem', borderRadius: '4px', color: 'var(--text-secondary)', fontSize: '0.85rem', flex: 1 }}
                  disabled={isProcessing}
                />
              </div>
            </div>
          </form>

          {orchestratorState?.finalSkill && (
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <Dashboard skillData={orchestratorState.finalSkill} />
            </div>
          )}
        </main>
      </div>

      <button className="dev-toggle" onClick={() => setIsDevModeOpen(!isDevModeOpen)} title="Toggle Dev Mode">
        <Settings2 size={24} color={isDevModeOpen ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
      </button>

      <DevMode 
        isOpen={isDevModeOpen} 
        onClose={() => setIsDevModeOpen(false)} 
        state={orchestratorState} 
      />
    </>
  );
}

export default App;
