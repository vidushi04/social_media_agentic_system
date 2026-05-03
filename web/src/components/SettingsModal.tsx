import React, { useState } from 'react';
import { X, Key } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  youtubeKey: string;
  setYoutubeKey: (key: string) => void;
  geminiKey: string;
  setGeminiKey: (key: string) => void;
  mockMode: boolean;
  setMockMode: (mode: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  youtubeKey,
  setYoutubeKey,
  geminiKey,
  setGeminiKey,
  mockMode,
  setMockMode,
}) => {
  const [localYoutube, setLocalYoutube] = useState(youtubeKey);
  const [localGemini, setLocalGemini] = useState(geminiKey);
  const [localMockMode, setLocalMockMode] = useState(mockMode);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setYoutubeKey(localYoutube);
    setGeminiKey(localGemini);
    setMockMode(localMockMode);
    localStorage.setItem('YOUTUBE_API_KEY', localYoutube);
    localStorage.setItem('GEMINI_API_KEY', localGemini);
    localStorage.setItem('MOCK_MODE', localMockMode ? 'true' : 'false');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ animation: 'fadeIn 0.2s ease-out' }}>
        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.25rem' }}>
            <Key size={20} color="var(--accent-primary)" /> API Configuration
          </h2>
          <button className="btn-icon" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Bring Your Own Keys. We don't store your data. Your API keys remain securely in your browser's local storage.
        </p>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              YouTube Data API v3 Key <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input
              type="password"
              required
              className="premium-input"
              value={localYoutube}
              onChange={(e) => setLocalYoutube(e.target.value)}
              placeholder="AIzaSy..."
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Gemini API Key <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input
              type="password"
              required
              className="premium-input"
              value={localGemini}
              onChange={(e) => setLocalGemini(e.target.value)}
              placeholder="AIzaSy..."
            />
          </div>
          
          <div style={{ marginTop: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={localMockMode} 
                onChange={(e) => setLocalMockMode(e.target.checked)} 
                style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
              />
              Enable Mock Mode (No API Quota Used)
            </label>
            <p style={{ margin: '0.25rem 0 0 1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Returns pre-written agent data instantly so you can test the UI flow without using real API keys or hitting rate limits.
            </p>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Save Keys</button>
          </div>
        </form>
      </div>
    </div>
  );
};
