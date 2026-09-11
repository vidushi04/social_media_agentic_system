import React, { useEffect, useState } from 'react';
import {
  fetchAdminUsers,
  fetchAdminUserAnalyses,
  fetchAdminAnalytics,
  fetchAdminAccessRequests,
  fetchAdminFeedback,
  reviewAdminAccessRequest,
  updateAdminUserAccess,
  fetchAdminSettings,
  updateAdminMockMode,
  exportAdminUserUrl,
  deleteAdminUser,
  adminLogout,
  AdminUnauthorizedError,
  type AdminUserSummary,
  type AdminAnalyticsSummary,
  type AdminAnalysisRow,
  type AdminAccessRequest,
  type AdminFeedbackRow,
} from './adminApi';
import { isWaitlistEnabled } from '../config/waitlist';

interface AdminDashboardProps {
  onUnauthorized: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onUnauthorized }) => {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [accessRequests, setAccessRequests] = useState<AdminAccessRequest[]>([]);
  const [feedback, setFeedback] = useState<AdminFeedbackRow[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalyticsSummary | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUserSummary | null>(null);
  const [userAnalyses, setUserAnalyses] = useState<AdminAnalysisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [globalMockMode, setGlobalMockMode] = useState(false);
  const [mockModeSaving, setMockModeSaving] = useState(false);

  const handleError = (err: unknown) => {
    if (err instanceof AdminUnauthorizedError) {
      onUnauthorized();
      return;
    }
    setError(err instanceof Error ? err.message : 'Something went wrong.');
  };

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersData, analyticsData, requestsData, settingsData, feedbackData] = await Promise.all([
        fetchAdminUsers(),
        fetchAdminAnalytics(),
        isWaitlistEnabled ? fetchAdminAccessRequests('pending') : Promise.resolve([]),
        fetchAdminSettings(),
        fetchAdminFeedback(),
      ]);
      setUsers(usersData);
      setAnalytics(analyticsData);
      setAccessRequests(requestsData);
      setGlobalMockMode(settingsData.mock_mode_enabled);
      setFeedback(feedbackData);
    } catch (err) {
      handleError(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const openUser = async (user: AdminUserSummary) => {
    setSelectedUser(user);
    setUserAnalyses([]);
    setDeleteConfirmText('');
    try {
      const data = await fetchAdminUserAnalyses(user.user_id);
      setUserAnalyses(data);
    } catch (err) {
      handleError(err);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser || deleteConfirmText !== selectedUser.email) return;
    setDeleting(true);
    try {
      await deleteAdminUser(selectedUser.user_id);
      setSelectedUser(null);
      await loadAll();
    } catch (err) {
      handleError(err);
    }
    setDeleting(false);
  };

  const handleReview = async (requestId: string, action: 'approve' | 'reject') => {
    setReviewingId(requestId);
    setError('');
    try {
      await reviewAdminAccessRequest(requestId, action);
      await loadAll();
    } catch (err) {
      handleError(err);
    }
    setReviewingId(null);
  };

  const accessBadge = (status: string) => {
    const colors: Record<string, string> = {
      approved: '#0a7',
      pending: '#c80',
      rejected: 'var(--error)',
    };
    return (
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: colors[status] || 'var(--mute)' }}>
        {status}
      </span>
    );
  };

  const handleToggleGlobalMock = async () => {
    setMockModeSaving(true);
    setError('');
    const next = !globalMockMode;
    try {
      await updateAdminMockMode(next);
      setGlobalMockMode(next);
    } catch (err) {
      handleError(err);
    }
    setMockModeSaving(false);
  };

  const handleSignOut = async () => {
    await adminLogout().catch(() => {});
    onUnauthorized();
  };

  return (
    <div className="studio-app">
      <header className="studio-topbar">
        <h1 className="studio-logo">Trellis Admin</h1>
        <div className="studio-topbar-spacer" />
        <button className="btn-secondary" onClick={handleSignOut}>Sign out</button>
      </header>

      <main className="studio-content" style={{ padding: '1.5rem' }}>
        {error && (
          <div className="studio-error" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="spinner" />
        ) : (
          <>
            {analytics && (
              <div className="studio-perf-card" style={{ marginBottom: '1.5rem' }}>
                <h3 className="studio-perf-title">System analytics</h3>
                <div style={{ display: 'flex', gap: '2rem', marginTop: '0.75rem' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--mute)' }}>Total users</p>
                    <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink)' }}>{analytics.total_users}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--mute)' }}>Total analyses</p>
                    <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink)' }}>{analytics.total_analyses}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="studio-perf-card" style={{ marginBottom: '1.5rem' }}>
              <h3 className="studio-perf-title">Analysis mode</h3>
              <p style={{ color: 'var(--mute)', fontSize: '0.85rem', margin: '0.5rem 0 1rem', lineHeight: 1.5 }}>
                When enabled, all users get instant mock analyses — no YouTube or Gemini API credits used.
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontWeight: 600, color: 'var(--ink)' }}>
                <input
                  type="checkbox"
                  checked={globalMockMode}
                  disabled={mockModeSaving}
                  onChange={() => void handleToggleGlobalMock()}
                  style={{ accentColor: 'var(--primary)', width: '18px', height: '18px' }}
                />
                {mockModeSaving ? 'Saving…' : globalMockMode ? 'Mock mode enabled (system-wide)' : 'Mock mode disabled (real APIs)'}
              </label>
            </div>

            {isWaitlistEnabled && (
            <div className="studio-perf-card" style={{ marginBottom: '1.5rem' }}>
              <h3 className="studio-perf-title">Access requests ({accessRequests.length} pending)</h3>
              {accessRequests.length === 0 ? (
                <p style={{ color: 'var(--mute)', fontSize: '0.85rem', marginTop: '0.75rem' }}>No pending applications.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.75rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', fontSize: '0.8rem', color: 'var(--mute)' }}>
                      <th style={{ padding: '0.5rem' }}>Email</th>
                      <th style={{ padding: '0.5rem' }}>Name</th>
                      <th style={{ padding: '0.5rem' }}>Applied</th>
                      <th style={{ padding: '0.5rem' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {accessRequests.map((r) => (
                      <tr key={r.id} style={{ borderTop: '1px solid var(--studio-border)' }}>
                        <td style={{ padding: '0.5rem' }}>{r.email}</td>
                        <td style={{ padding: '0.5rem' }}>{r.display_name || '—'}</td>
                        <td style={{ padding: '0.5rem' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            className="btn-primary"
                            disabled={reviewingId === r.id}
                            onClick={() => handleReview(r.id, 'approve')}
                          >
                            {reviewingId === r.id ? '…' : 'Approve'}
                          </button>
                          <button
                            className="btn-secondary"
                            disabled={reviewingId === r.id}
                            onClick={() => handleReview(r.id, 'reject')}
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            )}

            <div className="studio-perf-card" style={{ marginBottom: '1.5rem' }}>
              <h3 className="studio-perf-title">Feedback ({feedback.length})</h3>
              {feedback.length === 0 ? (
                <p style={{ color: 'var(--mute)', fontSize: '0.85rem', marginTop: '0.75rem' }}>
                  No feedback submitted yet.
                </p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.75rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', fontSize: '0.8rem', color: 'var(--mute)' }}>
                      <th style={{ padding: '0.5rem' }}>When</th>
                      <th style={{ padding: '0.5rem' }}>Email</th>
                      <th style={{ padding: '0.5rem' }}>Rating</th>
                      <th style={{ padding: '0.5rem' }}>Recommend</th>
                      <th style={{ padding: '0.5rem' }}>Most useful</th>
                      <th style={{ padding: '0.5rem' }}>Improve</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedback.map((item) => (
                      <tr key={item.id} style={{ borderTop: '1px solid var(--studio-border)', verticalAlign: 'top' }}>
                        <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>
                          {new Date(item.created_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.5rem' }}>{item.email || '—'}</td>
                        <td style={{ padding: '0.5rem' }}>{item.rating ?? '—'}</td>
                        <td style={{ padding: '0.5rem' }}>{item.would_recommend || '—'}</td>
                        <td style={{ padding: '0.5rem' }}>{item.most_useful_feature || '—'}</td>
                        <td style={{ padding: '0.5rem' }}>{item.improvement_suggestion || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="studio-perf-card">
              <h3 className="studio-perf-title">Users ({users.length})</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.75rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', fontSize: '0.8rem', color: 'var(--mute)' }}>
                    <th style={{ padding: '0.5rem' }}>Email</th>
                    {isWaitlistEnabled && <th style={{ padding: '0.5rem' }}>Access</th>}
                    <th style={{ padding: '0.5rem' }}>YouTube handle</th>
                    <th style={{ padding: '0.5rem' }}>Analyses</th>
                    <th style={{ padding: '0.5rem' }}>Joined</th>
                    <th style={{ padding: '0.5rem' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.user_id} style={{ borderTop: '1px solid var(--studio-border)' }}>
                      <td style={{ padding: '0.5rem' }}>{u.email}</td>
                      {isWaitlistEnabled && (
                        <td style={{ padding: '0.5rem' }}>{accessBadge(u.access_status || 'pending')}</td>
                      )}
                      <td style={{ padding: '0.5rem' }}>{u.youtube_username || '—'}</td>
                      <td style={{ padding: '0.5rem' }}>{u.analysis_count}</td>
                      <td style={{ padding: '0.5rem' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '0.5rem' }}>
                        <button className="btn-secondary" onClick={() => openUser(u)}>Inspect</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content" style={{ maxWidth: '640px', maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, color: 'var(--ink)' }}>{selectedUser.email}</h2>
            <p style={{ color: 'var(--mute)', fontSize: '0.85rem' }}>
              {isWaitlistEnabled && <>{accessBadge(selectedUser.access_status || 'pending')} · </>}
              {selectedUser.youtube_username || 'No YouTube handle set'} · {userAnalyses.length} analyses
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', margin: '1rem 0', flexWrap: 'wrap' }}>
              <a className="btn-secondary" href={exportAdminUserUrl(selectedUser.user_id)} target="_blank" rel="noreferrer">
                Export data
              </a>
              {isWaitlistEnabled && selectedUser.access_status !== 'approved' && (
                <button
                  className="btn-primary"
                  disabled={reviewingId === selectedUser.user_id}
                  onClick={async () => {
                    setReviewingId(selectedUser.user_id);
                    try {
                      await updateAdminUserAccess(selectedUser.user_id, 'approve');
                      setSelectedUser(null);
                      await loadAll();
                    } catch (err) {
                      handleError(err);
                    }
                    setReviewingId(null);
                  }}
                >
                  Approve access
                </button>
              )}
              {isWaitlistEnabled && selectedUser.access_status !== 'rejected' && (
                <button
                  className="btn-secondary"
                  disabled={reviewingId === selectedUser.user_id}
                  onClick={async () => {
                    setReviewingId(selectedUser.user_id);
                    try {
                      await updateAdminUserAccess(selectedUser.user_id, 'reject');
                      setSelectedUser(null);
                      await loadAll();
                    } catch (err) {
                      handleError(err);
                    }
                    setReviewingId(null);
                  }}
                >
                  Revoke access
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '260px', overflowY: 'auto' }}>
              {userAnalyses.map((a) => (
                <div key={a.id} style={{ border: '1px solid var(--studio-border)', borderRadius: '8px', padding: '0.75rem' }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>
                    {(a.data_collector?.title as string | undefined) || a.video_url}
                  </p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--mute)' }}>
                    {new Date(a.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
              {userAnalyses.length === 0 && <p style={{ color: 'var(--mute)', fontSize: '0.85rem' }}>No analyses yet.</p>}
            </div>

            <div style={{ borderTop: '1px solid var(--studio-border)', marginTop: '1.5rem', paddingTop: '1rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--error)', fontWeight: 600, marginBottom: '0.5rem' }}>
                Delete this user permanently
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--mute)', marginBottom: '0.5rem' }}>
                Type <strong>{selectedUser.email}</strong> to confirm. This removes their account and all analyses and cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  className="text-input"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={selectedUser.email}
                />
                <button
                  className="btn-primary"
                  style={{ background: 'var(--error)', flexShrink: 0 }}
                  disabled={deleteConfirmText !== selectedUser.email || deleting}
                  onClick={handleDelete}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn-secondary" onClick={() => setSelectedUser(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
