import { supabase } from './supabaseClient';
import { hasLocalAnalysisHistory } from './knowledgeBase';
import type { Profile } from './supabaseClient';

export type OnboardingStatus = 'pending' | 'completed' | 'skipped';

const GUEST_ONBOARDING_KEY = 'TRELLIS_ONBOARDING_STATUS';
const AUTH_FALLBACK_PREFIX = 'TRELLIS_ONBOARDING_STATUS:';
const NEW_ACCOUNT_WINDOW_MS = 15 * 60 * 1000;

const isDone = (status?: OnboardingStatus | string | null): boolean =>
  status === 'completed' || status === 'skipped';

const readStorage = (key: string): OnboardingStatus | null => {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(key);
  if (value === 'pending' || value === 'completed' || value === 'skipped') return value;
  return null;
};

const writeStorage = (key: string, status: OnboardingStatus) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, status);
};

export const shouldShowGuestOnboarding = (): boolean => {
  const stored = readStorage(GUEST_ONBOARDING_KEY);
  if (isDone(stored)) return false;
  if (stored === 'pending') return true;
  if (hasLocalAnalysisHistory()) {
    writeStorage(GUEST_ONBOARDING_KEY, 'skipped');
    return false;
  }
  return true;
};

export const shouldShowProfileOnboarding = (profile: Profile): boolean => {
  const fallback = readStorage(`${AUTH_FALLBACK_PREFIX}${profile.user_id}`);
  const status = fallback ?? profile.onboarding_status ?? null;

  if (isDone(status)) return false;
  if (status === 'pending') return true;

  const created = Date.parse(profile.created_at);
  if (Number.isFinite(created) && Date.now() - created > NEW_ACCOUNT_WINDOW_MS) {
    return false;
  }
  return true;
};

export const persistOnboardingStatus = async (params: {
  status: OnboardingStatus;
  isLocalMode: boolean;
  userId?: string;
}): Promise<void> => {
  const { status, isLocalMode, userId } = params;

  if (isLocalMode) {
    writeStorage(GUEST_ONBOARDING_KEY, status);
    return;
  }

  if (userId) {
    writeStorage(`${AUTH_FALLBACK_PREFIX}${userId}`, status);
  }

  if (!userId || !supabase) return;

  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_status: status })
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to persist onboarding status', error);
  }
};
