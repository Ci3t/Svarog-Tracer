/**
 * ZZZ Stats API Endpoint (DEPRECATED)
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).json({ 
    error: 'ZZZ tracking is currently disabled', 
    message: 'The source data site is unavailable and tracking is paused.' 
  });
}
