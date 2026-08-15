export interface WaitlistApplyPayload {
  email: string;
  display_name?: string;
  message?: string;
}

export const applyForAccess = async (payload: WaitlistApplyPayload): Promise<string> => {
  const res = await fetch('/api/waitlist-apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `Request failed (${res.status}).`);
  }
  return body.message || 'Application received.';
};
