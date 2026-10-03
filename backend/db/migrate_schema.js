const { pool } = require('./index');

async function migrate() {
    console.log('🔄 Running database schema migration for email verification...');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Add is_verified column
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
        `);

        // 2. Add verification_token column
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS verification_token TEXT;
        `);

        // 3. Add verification_expires column
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS verification_expires TIMESTAMP;
        `);

        // 4. Mark existing users as verified so they can log in immediately
        await client.query(`
            UPDATE users 
            SET is_verified = TRUE 
            WHERE is_verified IS NULL OR is_verified = FALSE;
        `);

        await client.query('COMMIT');
        console.log('✅ Schema migration completed successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().then(() => {
    process.exit(0);
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
