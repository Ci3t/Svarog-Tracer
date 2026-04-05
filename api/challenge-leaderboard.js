import { handler as challengeLeaderboardHandler } from './_services/challenge/leaderboard.js';

export default async function handler(req, res) {
  return challengeLeaderboardHandler(req, res);
}
