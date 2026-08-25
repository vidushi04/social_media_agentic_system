import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../auth/AuthContext';

export const YoutubeHandlePrompt: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [handle, setHandle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!user || !profile || profile.youtube_username_confirmed) return null;

  const markConfirmed = async (username?: string) => {
    if (!supabase) return false;
    setSaving(true);
    setError('');
    const update: { youtube_username_confirmed: true; youtube_username?: string } = {
      youtube_username_confirmed: true,
    };
    if (username) update.youtube_username = username;
    const { error: updateError } = await supabase
      .from('profiles')
      .update(update)
      .eq('user_id', user.id);
    setSaving(false);
    if (updateError) {
      setError('Could not save. Please try again.');
      return false;
    }
    await refreshProfile();
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle.trim()) return;
    await markConfirmed(handle.trim());
  };

  const handleDismiss = async () => {
    await markConfirmed();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ animation: 'fadeIn 0.2s ease-out' }}>
        <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--ink)' }}>
            What's your YouTube channel?
          </h2>
          <button
            className="btn-icon"
            onClick={handleDismiss}
            type="button"
            disabled={saving}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <p style={{ color: 'var(--mute)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          We use this to personalize your dashboard. You can change it later in Settings.
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="text"
            className="text-input"
            placeholder="@yourchannel"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            autoFocus
            disabled={saving}
          />
          {error && <div className="studio-error">{error}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary" disabled={saving || !handle.trim()}>
              {saving ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
