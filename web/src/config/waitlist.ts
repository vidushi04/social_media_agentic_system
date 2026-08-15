/** Set VITE_WAITLIST_ENABLED=true in web/.env to turn on early-access gating. */
export const isWaitlistEnabled = import.meta.env.VITE_WAITLIST_ENABLED === 'true';
