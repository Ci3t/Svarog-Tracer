import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.TURSO_DB_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('TURSO_DB_URL or TURSO_AUTH_TOKEN not set');
  process.exit(1);
}

const client = createClient({ url, authToken });

async function run() {
  try {
    // Create game patch timers table (for all games: hsr, genshin, wuwa, zzz)
    await client.execute(`
      CREATE TABLE IF NOT EXISTS game_patch_timers (
        game TEXT PRIMARY KEY,
        current_patch TEXT NOT NULL,
        patch_start_date TEXT NOT NULL,
        patch_duration_days INTEGER NOT NULL DEFAULT 42,
        auto_advance INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Insert default rows for each game if not exists
    const games = [
      { game: 'hsr', patch: '4.2', start: '2025-04-09', duration: 42 },
      { game: 'genshin', patch: '6.5', start: '2025-04-16', duration: 42 },
      { game: 'wuwa', patch: '3.3', start: '2025-04-25', duration: 42 },
      { game: 'zzz', patch: '2.0', start: '2025-04-09', duration: 42 },
    ];

    for (const g of games) {
      await client.execute({
        sql: `
          INSERT INTO game_patch_timers (game, current_patch, patch_start_date, patch_duration_days, auto_advance)
          VALUES (?, ?, ?, ?, 1)
          ON CONFLICT (game) DO NOTHING
        `,
        args: [g.game, g.patch, g.start, g.duration]
      });
    }

    // Verify
    const result = await client.execute(`SELECT * FROM game_patch_timers ORDER BY game`);
    console.log('Game patch timers:');
    for (const row of result.rows) {
      console.log(`  ${row.game}: v${row.current_patch} (started ${row.patch_start_date}, ${row.patch_duration_days} days)`);
    }

    await client.close();
    console.log('Game patch timers table ready');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

run();
