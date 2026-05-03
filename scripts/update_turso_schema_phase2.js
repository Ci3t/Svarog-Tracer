import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

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
    console.log('Updating Turso schema for Phase 2...\n');

    // 1. Add user_id to kiyo_roll_events
    console.log('[1/4] Adding user_id to kiyo_roll_events...');
    await client.execute(`
      ALTER TABLE kiyo_roll_events ADD COLUMN user_id TEXT;
    `).catch(err => {
      if (err.message.includes('duplicate column')) {
        console.log('    user_id already exists, skipping');
      } else {
        throw err;
      }
    });

    // 2. Add user_id and roll_count to kiyo_sessions
    console.log('[2/4] Adding user_id and roll_count to kiyo_sessions...');
    await client.execute(`
      ALTER TABLE kiyo_sessions ADD COLUMN user_id TEXT;
    `).catch(err => {
      if (err.message.includes('duplicate column')) {
        console.log('    user_id already exists, skipping');
      } else {
        throw err;
      }
    });
    await client.execute(`
      ALTER TABLE kiyo_sessions ADD COLUMN roll_count INTEGER NOT NULL DEFAULT 0;
    `).catch(err => {
      if (err.message.includes('duplicate column')) {
        console.log('    roll_count already exists, skipping');
      } else {
        throw err;
      }
    });

    // 3. Create kiyo_user_stats table
    console.log('[3/4] Creating kiyo_user_stats table...');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS kiyo_user_stats (
        user_id         TEXT NOT NULL,
        patch           TEXT NOT NULL,
        region          TEXT NOT NULL,
        prefix          TEXT NOT NULL,
        exact_roll      TEXT NOT NULL,
        count_live      INTEGER NOT NULL DEFAULT 0,
        count_imported  INTEGER NOT NULL DEFAULT 0,
        last_updated    TEXT NOT NULL,
        PRIMARY KEY (user_id, patch, region, exact_roll)
      );
    `);
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_kus_user_patch
        ON kiyo_user_stats (user_id, patch);
    `);
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_kus_user_region
        ON kiyo_user_stats (user_id, patch, region);
    `);

    // 4. Verify
    console.log('[4/4] Verifying schema...');
    const tablesResult = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    console.log('Tables:', tablesResult.rows.map(r => r.name));

    const columnsResult = await client.execute(
      "SELECT name FROM pragma_table_info('kiyo_roll_events')"
    );
    console.log('kiyo_roll_events columns:', columnsResult.rows.map(r => r.name).join(', '));

    const sessionsCols = await client.execute(
      "SELECT name FROM pragma_table_info('kiyo_sessions')"
    );
    console.log('kiyo_sessions columns:', sessionsCols.rows.map(r => r.name).join(', '));

    await client.close();
    console.log('\nSchema update complete!');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

run();