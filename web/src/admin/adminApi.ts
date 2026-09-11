export class AdminUnauthorizedError extends Error {}

async function adminFetch(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (res.status === 401) throw new AdminUnauthorizedError('Not authenticated as admin.');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status}).`);
  }
  return res;
}

export interface AdminUserSummary {
  user_id: string;
  email: string;
  youtube_username: string | null;
  access_status: 'pending' | 'approved' | 'rejected';
  approved_at: string | null;
  created_at: string;
  analysis_count: number;
}

export interface AdminAccessRequest {
  id: string;
  email: string;
  display_name: string | null;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at: string | null;
}

export interface AdminAnalyticsSummary {
  total_users: number;
  total_analyses: number;
  analyses_per_week: { week: string; count: number }[];
}

export interface AdminAnalysisRow {
  id: string;
  user_id: string;
  video_url: string;
  data_collector: Record<string, unknown> | null;
  deconstructor: Record<string, unknown> | null;
  audience: Record<string, unknown> | null;
  pattern: Record<string, unknown> | null;
  coach: Record<string, unknown> | null;
  created_at: string;
}

export interface AdminFeedbackRow {
  id: string;
  user_id: string | null;
  email: string | null;
  rating: number | null;
  most_useful_feature: string | null;
  improvement_suggestion: string | null;
  would_recommend: string | null;
  created_at: string;
}

export const adminLogin = async (password: string): Promise<void> => {
  await adminFetch('/api/admin-login', { method: 'POST', body: JSON.stringify({ password }) });
};

export const adminLogout = async (): Promise<void> => {
  await adminFetch('/api/admin-logout', { method: 'POST' });
};

export const fetchAdminUsers = async (): Promise<AdminUserSummary[]> => {
  const res = await adminFetch('/api/admin-users');
  return res.json();
};

export const fetchAdminUserAnalyses = async (userId: string): Promise<AdminAnalysisRow[]> => {
  const res = await adminFetch(`/api/admin-user-analyses?user_id=${encodeURIComponent(userId)}`);
  return res.json();
};

export const fetchAdminAnalytics = async (): Promise<AdminAnalyticsSummary> => {
  const res = await adminFetch('/api/admin-analytics');
  return res.json();
};

export const exportAdminUserUrl = (userId: string): string =>
  `/api/admin-export-user?user_id=${encodeURIComponent(userId)}`;

export const deleteAdminUser = async (userId: string): Promise<void> => {
  await adminFetch('/api/admin-delete-user', { method: 'POST', body: JSON.stringify({ user_id: userId }) });
};

export const fetchAdminAccessRequests = async (
  status?: 'pending' | 'approved' | 'rejected'
): Promise<AdminAccessRequest[]> => {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await adminFetch(`/api/admin-access-requests${qs}`);
  return res.json();
};

export const reviewAdminAccessRequest = async (
  requestId: string,
  action: 'approve' | 'reject'
): Promise<{ email_sent?: boolean }> => {
  const res = await adminFetch('/api/admin-access-request-review', {
    method: 'POST',
    body: JSON.stringify({
      request_id: requestId,
      action,
      app_url: typeof window !== 'undefined' ? window.location.origin : undefined,
    }),
  });
  return res.json();
};

export const updateAdminUserAccess = async (
  userId: string,
  action: 'approve' | 'reject'
): Promise<{ email_sent?: boolean }> => {
  const res = await adminFetch('/api/admin-update-user-access', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      action,
      app_url: typeof window !== 'undefined' ? window.location.origin : undefined,
    }),
  });
  return res.json();
};

export const fetchAdminFeedback = async (): Promise<AdminFeedbackRow[]> => {
  const res = await adminFetch('/api/admin-feedback');
  return res.json();
};

export const fetchAdminSettings = async (): Promise<{ mock_mode_enabled: boolean }> => {
  const res = await adminFetch('/api/admin-settings');
  return res.json();
};

export const updateAdminMockMode = async (enabled: boolean): Promise<void> => {
  await adminFetch('/api/admin-settings', {
    method: 'POST',
    body: JSON.stringify({ mock_mode_enabled: enabled }),
  });
};
