import { randomUUID } from 'node:crypto';
import { getSupabaseAdminClient } from './_supabaseAdmin.mjs';

const isMissingOrNotNull = (error) => {
  const text = [error?.code, error?.message, error?.details, error?.hint].filter(Boolean).join(' ');
  return /PGRST205|schema cache|could not find the table|null value in column ["']?user_id|violates not-null constraint/i.test(
    text
  );
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Analyses are not configured on the server.' });
  }

  const body = req.body || {};
  const videoUrl = typeof body.video_url === 'string' ? body.video_url.trim() : '';
  if (!videoUrl) {
    return res.status(400).json({ error: 'video_url is required.' });
  }

  const id =
    typeof body.id === 'string' && body.id.trim() ? body.id.trim() : randomUUID();
  const createdAt =
    typeof body.created_at === 'string' && body.created_at.trim()
      ? body.created_at.trim()
      : new Date().toISOString();

  const row = {
    id,
    user_id: null,
    video_url: videoUrl.slice(0, 2000),
    data_collector: body.data_collector ?? null,
    deconstructor: body.deconstructor ?? null,
    audience: body.audience ?? null,
    pattern: body.pattern ?? null,
    coach: body.coach ?? null,
    created_at: createdAt,
  };

  const { error: insertError } = await supabase.from('analyses').insert(row);
  if (!insertError) {
    return res.status(201).json({ ok: true, id });
  }

  if (!isMissingOrNotNull(insertError)) {
    return res.status(502).json({ error: insertError.message });
  }

  const { error: fallbackError } = await supabase.from('app_settings').upsert(
    {
      key: `analysis:${id}`,
      value: { ...row, is_guest: true },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  );

  if (fallbackError) {
    return res.status(502).json({ error: fallbackError.message });
  }

  return res.status(201).json({ ok: true, id });
}
