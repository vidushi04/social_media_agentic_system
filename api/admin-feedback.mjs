import { requireAdmin } from './_adminAuth.mjs';
import { getSupabaseAdminClient } from './_supabaseAdmin.mjs';

const isMissingTable = (error) =>
  error?.code === 'PGRST205' || /could not find the table ['"]?public\.feedback/i.test(error?.message || '');

const fromSettingsValue = (key, value, updatedAt) => {
  const data = value && typeof value === 'object' ? value : {};
  return {
    id: data.id || String(key).replace(/^feedback:/, ''),
    user_id: data.user_id || null,
    email: data.email || null,
    rating: data.rating ?? null,
    most_useful_feature: data.most_useful_feature || null,
    improvement_suggestion: data.improvement_suggestion || null,
    would_recommend: data.would_recommend || null,
    created_at: data.created_at || updatedAt,
  };
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  if (!requireAdmin(req, res)) return;

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured on the server.' });
  }

  const { data, error } = await supabase
    .from('feedback')
    .select('id, user_id, email, rating, most_useful_feature, improvement_suggestion, would_recommend, created_at')
    .order('created_at', { ascending: false });

  if (!error) {
    return res.status(200).json(data || []);
  }

  if (!isMissingTable(error)) {
    return res.status(502).json({ error: error.message });
  }

  const { data: settingsRows, error: settingsError } = await supabase
    .from('app_settings')
    .select('key, value, updated_at')
    .like('key', 'feedback:%')
    .order('updated_at', { ascending: false });

  if (settingsError) {
    return res.status(502).json({ error: settingsError.message });
  }

  const rows = (settingsRows || []).map((row) => fromSettingsValue(row.key, row.value, row.updated_at));
  return res.status(200).json(rows);
}
