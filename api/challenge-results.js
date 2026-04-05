import { handler as challengeResultsHandler } from './_services/challenge/results.js';

export default async function handler(req, res) {
  return challengeResultsHandler(req, res);
}
