// Server-side proxy for multi-turn Gemini chat (plain text).
// The analysis pipeline stays on /api/gemini (JSON-only).

const GEMINI_MODELS = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'];
const MAX_MESSAGES = 16;
const MAX_TEXT_LENGTH = 32000;

const isRetryableGeminiError = (status, message) =>
  status === 503 || /high demand|overloaded|unavailable|try again later/i.test(message || '');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
  }

  const { systemInstruction, messages } = req.body || {};
  if (typeof systemInstruction !== 'string' || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Invalid request body.' });
  }

  if (messages.length > MAX_MESSAGES) {
    return res.status(400).json({ error: 'Too many chat messages.' });
  }

  const contents = [];
  for (const item of messages) {
    if (!item || (item.role !== 'user' && item.role !== 'model' && item.role !== 'assistant')) {
      return res.status(400).json({ error: 'Invalid chat message.' });
    }
    if (typeof item.text !== 'string' || !item.text.trim()) {
      return res.status(400).json({ error: 'Invalid chat message.' });
    }
    if (item.text.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({ error: 'A chat message is too long.' });
    }
    contents.push({
      role: item.role === 'assistant' ? 'model' : item.role,
      parts: [{ text: item.text }],
    });
  }

  const payload = JSON.stringify({
    contents,
    systemInstruction: { parts: [{ text: systemInstruction }] },
  });

  try {
    let lastStatus = 502;
    let lastMessage = 'Gemini request failed.';

    for (const model of GEMINI_MODELS) {
      const upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        }
      );

      const data = await upstream.json();
      if (upstream.ok) {
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return res.status(200).json({ text });
      }

      lastStatus = upstream.status;
      lastMessage = data?.error?.message || 'Gemini request failed.';
      if (!isRetryableGeminiError(upstream.status, lastMessage)) {
        return res.status(upstream.status).json({ error: lastMessage });
      }
    }

    return res.status(lastStatus).json({ error: lastMessage });
  } catch {
    return res.status(502).json({ error: 'Failed to reach the Gemini API.' });
  }
}
