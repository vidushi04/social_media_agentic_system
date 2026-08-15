import { requireAdmin } from './_adminAuth.mjs';
import { getMockModeEnabled, setMockModeEnabled } from './_appSettings.mjs';

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  if (req.method === 'GET') {
    const mock_mode_enabled = await getMockModeEnabled();
    return res.status(200).json({ mock_mode_enabled });
  }

  if (req.method === 'POST') {
    const { mock_mode_enabled } = req.body || {};
    if (typeof mock_mode_enabled !== 'boolean') {
      return res.status(400).json({ error: 'mock_mode_enabled (boolean) is required.' });
    }
    try {
      await setMockModeEnabled(mock_mode_enabled);
      return res.status(200).json({ ok: true, mock_mode_enabled });
    } catch (err) {
      return res.status(502).json({ error: err.message || 'Failed to update settings.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}
