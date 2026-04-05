import { handler as statsHandler } from './_services/pvp/stats.js';

export default async function handler(req, res) {
  return statsHandler(req, res);
}
