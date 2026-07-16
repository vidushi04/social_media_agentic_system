// Server-side proxy for the YouTube Data API.
// The API key lives in the YOUTUBE_API_KEY env var (Vercel project settings)
// and never reaches the browser.

const ALLOWED_ENDPOINTS = new Set(['videos', 'videoCategories', 'commentThreads']);
const ALLOWED_PARAMS = new Set(['part', 'id', 'videoId', 'maxResults']);

export default async function handler(req, res) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'YOUTUBE_API_KEY is not configured on the server.' });
  }

  const { endpoint, ...rest } = req.query;
  if (typeof endpoint !== 'string' || !ALLOWED_ENDPOINTS.has(endpoint)) {
    return res.status(400).json({ error: 'Unsupported endpoint.' });
  }

  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(rest)) {
    if (ALLOWED_PARAMS.has(name)) params.set(name, String(value));
  }
  params.set('key', key);

  try {
    const upstream = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${params}`);
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch {
    return res.status(502).json({ error: 'Failed to reach the YouTube Data API.' });
  }
}
