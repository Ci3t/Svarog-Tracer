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
    // Create patch config table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS kiyo_patch_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        current_patch TEXT NOT NULL DEFAULT '4.2',
        patch_start_date TEXT NOT NULL DEFAULT (date('now')),
        advance_days INTEGER NOT NULL DEFAULT 42,
        manual_override_at TEXT,
        manual_override_by TEXT,
        timer_mode TEXT DEFAULT 'fresh',
        auto_advance INTEGER NOT NULL DEFAULT 1
      )
    `);

    // Insert default row if not exists
    await client.execute(`
      INSERT INTO kiyo_patch_config (id, current_patch, patch_start_date, advance_days, timer_mode, auto_advance)
      VALUES (1, '4.2', date('now'), 42, 'fresh', 1)
      ON CONFLICT (id) DO NOTHING
    `);

    // Verify
    const result = await client.execute(`SELECT * FROM kiyo_patch_config WHERE id = 1`);
    console.log('Patch config:', result.rows[0]);

    await client.close();
    console.log('Patch config table ready');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

run();