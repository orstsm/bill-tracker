export default function handler(_req, res) {
  return res.status(503).json({
    error: 'External notification jobs are disabled in this production build.',
  });
}
