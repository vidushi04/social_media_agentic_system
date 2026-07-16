// Server-side proxy for the Gemini API.
// The API key lives in the GEMINI_API_KEY env var (Vercel project settings)
// and never reaches the browser.

const GEMINI_MODEL = 'gemini-2.5-pro';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
  }

  const { input, systemInstruction, responseSchema } = req.body || {};
  if (typeof input !== 'string' || typeof systemInstruction !== 'string') {
    return res.status(400).json({ error: 'Invalid request body.' });
  }

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: input }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: {
            responseMimeType: 'application/json',
            ...(responseSchema ? { responseSchema } : {}),
          },
        }),
      }
    );

    const data = await upstream.json();
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: data?.error?.message || 'Gemini request failed.' });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return res.status(200).json({ text });
  } catch {
    return res.status(502).json({ error: 'Failed to reach the Gemini API.' });
  }
}
