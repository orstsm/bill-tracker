export default function handler(_req, res) {
  return res.status(503).json({
    error: 'External notifications are disabled in this production build.',
  });
}
