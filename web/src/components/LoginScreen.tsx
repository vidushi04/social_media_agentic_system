import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { applyForAccess } from '../utils/waitlistApi';
import { isWaitlistEnabled } from '../config/waitlist';

type LoginTab = 'signin' | 'apply';

export const LoginScreen: React.FC = () => {
  const { signInWithGoogle, continueInLocalMode } = useAuth();
  const [tab, setTab] = useState<LoginTab>('signin');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');
  const [applyError, setApplyError] = useState('');

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyLoading(true);
    setApplyError('');
    setApplyMessage('');
    try {
      const msg = await applyForAccess({
        email: email.trim(),
        display_name: displayName.trim() || undefined,
        message: message.trim() || undefined,
      });
      setApplyMessage(msg);
      setEmail('');
      setDisplayName('');
      setMessage('');
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : 'Could not submit application.');
    }
    setApplyLoading(false);
  };

  if (!isWaitlistEnabled) {
    return (
      <div className="studio-app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="modal-content" style={{ maxWidth: '420px', textAlign: 'center' }}>
          <h1 className="studio-logo" style={{ marginBottom: '0.5rem' }}>Trellis</h1>
          <p style={{ color: 'var(--mute)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.5 }}>
            Sign in with Google to save your video analyses and get creator insights personalized to your own channel history.
          </p>
          <button type="button" className="btn-gradient" style={{ width: '100%', justifyContent: 'center' }} onClick={signInWithGoogle}>
            Sign in with Google
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.75rem' }}
            onClick={continueInLocalMode}
          >
            Continue without an account
          </button>
          <p style={{ color: 'var(--mute)', fontSize: '0.75rem', marginTop: '1rem' }}>
            Local mode stores analyses in this browser only and isn&apos;t shared across devices.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="studio-app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content" style={{ maxWidth: '420px', textAlign: 'center' }}>
        <h1 className="studio-logo" style={{ marginBottom: '0.5rem' }}>Trellis</h1>
        <p style={{ color: 'var(--mute)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          Early access — apply for a spot, then sign in once approved.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <button
            type="button"
            className={tab === 'signin' ? 'btn-gradient' : 'btn-secondary'}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => setTab('signin')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={tab === 'apply' ? 'btn-gradient' : 'btn-secondary'}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => setTab('apply')}
          >
            Apply for access
          </button>
        </div>

        {tab === 'signin' ? (
          <>
            <p style={{ color: 'var(--mute)', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.5 }}>
              Use the Google account that matches your approved application email.
            </p>
            <button
              type="button"
              className="btn-gradient"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={signInWithGoogle}
            >
              Sign in with Google
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '0.75rem' }}
              onClick={continueInLocalMode}
            >
              Continue without an account
            </button>
            <p style={{ color: 'var(--mute)', fontSize: '0.75rem', marginTop: '1rem' }}>
              Local mode stores analyses in this browser only and skips the waitlist.
            </p>
          </>
        ) : (
          <form onSubmit={handleApply} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              className="text-input"
              type="email"
              placeholder="Email (same as your Google account)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="text-input"
              type="text"
              placeholder="Name (optional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <textarea
              className="text-input"
              placeholder="Why do you want access? (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              style={{ resize: 'vertical' }}
            />
            {applyError && <div className="studio-error">{applyError}</div>}
            {applyMessage && (
              <p style={{ color: 'var(--ink)', fontSize: '0.85rem', margin: 0, lineHeight: 1.4 }}>{applyMessage}</p>
            )}
            <button type="submit" className="btn-gradient" style={{ width: '100%', justifyContent: 'center' }} disabled={applyLoading || !email.trim()}>
              {applyLoading ? 'Submitting...' : 'Submit application'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
