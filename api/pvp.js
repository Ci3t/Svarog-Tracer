import { handler as roomsHandler } from './_services/pvp/rooms.js';

export default async function handler(req, res) {
  return roomsHandler(req, res);
}
