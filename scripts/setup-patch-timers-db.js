import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

async function setup() {
  const url = process.env.TURSO_DB_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("Missing TURSO_DB_URL or TURSO_AUTH_TOKEN in .env.local");
    process.exit(1);
  }

  const db = createClient({ url, authToken });

  console.log("Creating game_patch_timers table...");
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS game_patch_timers (
        game TEXT PRIMARY KEY,
        current_patch TEXT NOT NULL,
        patch_start_date TEXT NOT NULL,
        patch_duration_days INTEGER NOT NULL DEFAULT 42,
        auto_advance INTEGER NOT NULL DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Table created successfully.");

    const defaults = [
      { game: 'hsr', patch: '3.7', start: '2026-04-22', days: 42 },
      { game: 'genshin', patch: '6.2', start: '2026-04-29', days: 42 },
      { game: 'wuwa', patch: '2.8', start: '2026-04-29', days: 42 },
      { game: 'zzz', patch: '2.4', start: '2026-04-23', days: 42 }
    ];

    console.log("Inserting default data...");
    for (const d of defaults) {
      await db.execute({
        sql: `INSERT INTO game_patch_timers (game, current_patch, patch_start_date, patch_duration_days, auto_advance)
              VALUES (?, ?, ?, ?, 0)
              ON CONFLICT(game) DO NOTHING`,
        args: [d.game, d.patch, d.start, d.days]
      });
      console.log(`Inserted defaults for ${d.game}`);
    }

    console.log("Setup complete!");
  } catch (err) {
    console.error("Error setting up table:", err);
  }
}

setup();