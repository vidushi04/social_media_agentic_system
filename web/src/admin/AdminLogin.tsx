import React, { useState } from 'react';
import { adminLogin } from './adminApi';

interface AdminLoginProps {
  onSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await adminLogin(password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    }
    setLoading(false);
  };

  return (
    <div className="studio-app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content" style={{ maxWidth: '380px' }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: 'var(--ink)' }}>Admin sign in</h1>
        <p style={{ color: 'var(--mute)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Separate from regular user accounts.
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="password"
            className="text-input"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {error && <div className="studio-error">{error}</div>}
          <button type="submit" className="btn-primary" disabled={loading || !password}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};
