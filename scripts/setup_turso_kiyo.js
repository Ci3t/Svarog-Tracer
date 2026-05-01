import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const url = process.env.TURSO_DB_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('TURSO_DB_URL or TURSO_AUTH_TOKEN not set in .env');
  process.exit(1);
}

const client = createClient({ url, authToken });

async function run() {
  try {
    // Check existing tables
    const tablesResult = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    const existing = tablesResult.rows.map(r => r.name);
    console.log('Existing tables:', existing);

    // Read and execute SQL files
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const scriptsDir = join(__dirname, '..', 'debugfiles', 'tursoDB');

    const scriptFiles = [
      '01_kiyo_patch_stats.sql',
      '02_kiyo_rate_limits.sql',
      '03_kiyo_roll_events.sql',
      '04_kiyo_sessions.sql',
    ];

    for (const file of scriptFiles) {
      const sql = readFileSync(join(scriptsDir, file), 'utf-8');
      const statements = sql.split(';').filter(s => s.trim().length > 0);

      for (const stmt of statements) {
        const trimmed = stmt.trim();
        if (trimmed.toLowerCase().startsWith('select')) {
          const result = await client.execute(trimmed);
          console.log(`[${file}] SELECT result:`, result.rows);
        } else {
          await client.execute(trimmed);
          console.log(`[${file}] Executed: ${trimmed.slice(0, 60)}...`);
        }
      }
    }

    // Verify tables created
    const finalTables = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    console.log('Final tables:', finalTables.rows.map(r => r.name));

    await client.close();
    console.log('\nTurso setup complete!');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

run();