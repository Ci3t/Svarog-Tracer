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
    // Add phase columns if not exist
    try {
      await client.execute(`ALTER TABLE kiyo_patch_config ADD COLUMN phase_1_days INTEGER NOT NULL DEFAULT 21`);
      console.log('Added phase_1_days');
    } catch (e) {
      if (!e.message.includes('duplicate column')) throw e;
      console.log('phase_1_days already exists');
    }

    try {
      await client.execute(`ALTER TABLE kiyo_patch_config ADD COLUMN phase_2_days INTEGER NOT NULL DEFAULT 21`);
      console.log('Added phase_2_days');
    } catch (e) {
      if (!e.message.includes('duplicate column')) throw e;
      console.log('phase_2_days already exists');
    }

    // Update existing row to have proper defaults
    await client.execute(`
      UPDATE kiyo_patch_config
      SET phase_1_days = COALESCE(phase_1_days, 21),
          phase_2_days = COALESCE(phase_2_days, 21),
          advance_days = COALESCE(phase_1_days, 21) + COALESCE(phase_2_days, 21)
      WHERE id = 1
    `);

    const result = await client.execute(`SELECT * FROM kiyo_patch_config WHERE id = 1`);
    console.log('Patch config:', result.rows[0]);

    await client.close();
    console.log('Phase columns migration complete');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

run();
