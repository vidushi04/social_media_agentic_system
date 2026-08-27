import { getSupabaseAdminClient } from './_supabaseAdmin.mjs';

const RECOMMEND_VALUES = ['yes', 'no', 'maybe'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Feedback is not configured on the server.' });
  }

  const { user_id, email, rating, most_useful_feature, improvement_suggestion, would_recommend } = req.body || {};

  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: 'A rating between 1 and 5 is required.' });
  }

  if (!RECOMMEND_VALUES.includes(would_recommend)) {
    return res.status(400).json({ error: 'would_recommend must be "yes", "no", or "maybe".' });
  }

  const { error: insertError } = await supabase.from('feedback').insert({
    user_id: typeof user_id === 'string' && user_id ? user_id : null,
    email: typeof email === 'string' && email.trim() ? email.trim().slice(0, 200) : null,
    rating: ratingNum,
    most_useful_feature:
      typeof most_useful_feature === 'string' && most_useful_feature.trim()
        ? most_useful_feature.trim().slice(0, 200)
        : null,
    improvement_suggestion:
      typeof improvement_suggestion === 'string' && improvement_suggestion.trim()
        ? improvement_suggestion.trim().slice(0, 2000)
        : null,
    would_recommend,
  });

  if (insertError) {
    return res.status(502).json({ error: insertError.message });
  }

  return res.status(201).json({ ok: true, message: 'Thanks for the feedback!' });
}
