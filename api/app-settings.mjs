import { getMockModeEnabled } from './_appSettings.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const mock_mode_enabled = await getMockModeEnabled();
  return res.status(200).json({ mock_mode_enabled });
}
