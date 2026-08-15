import React from 'react';
import { useAuth } from '../auth/AuthContext';
import type { AccessStatus } from '../utils/supabaseClient';

interface AccessGateScreenProps {
  status: AccessStatus;
  email?: string;
}

export const AccessGateScreen: React.FC<AccessGateScreenProps> = ({ status, email }) => {
  const { signOut } = useAuth();

  const isRejected = status === 'rejected';

  return (
    <div className="studio-app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content" style={{ maxWidth: '440px', textAlign: 'center' }}>
        <h1 className="studio-logo" style={{ marginBottom: '0.5rem' }}>Trellis</h1>
        {isRejected ? (
          <>
            <h2 style={{ fontSize: '1.1rem', color: 'var(--ink)', margin: '0 0 0.75rem' }}>Access not granted</h2>
            <p style={{ color: 'var(--mute)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
              {email ? (
                <>The account <strong>{email}</strong> was not approved for early access.</>
              ) : (
                <>Your account was not approved for early access.</>
              )}
            </p>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: '1.1rem', color: 'var(--ink)', margin: '0 0 0.75rem' }}>Waiting for approval</h2>
            <p style={{ color: 'var(--mute)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
              {email ? (
                <>
                  <strong>{email}</strong> is signed in, but early access has not been approved yet.
                  We will email you when an admin approves your application.
                </>
              ) : (
                <>Your account is signed in, but early access has not been approved yet.</>
              )}
            </p>
            <p style={{ color: 'var(--mute)', fontSize: '0.8rem', lineHeight: 1.5, marginTop: '0.75rem' }}>
              Have not applied yet? Sign out and use &ldquo;Apply for access&rdquo; on the login screen.
            </p>
          </>
        )}
        <button
          type="button"
          className="btn-secondary"
          style={{ width: '100%', justifyContent: 'center', marginTop: '1.5rem' }}
          onClick={signOut}
        >
          Sign out
        </button>
      </div>
    </div>
  );
};
