const { pool } = require('./index');

async function migrate() {
    console.log('🔄 Running database schema migration for phone support & verification...');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Add phone_number column if not exists
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);
        `);

        // 2. Make email nullable so users can register with either phone number or email
        await client.query(`
            ALTER TABLE users 
            ALTER COLUMN email DROP NOT NULL;
        `);

        // 3. Add is_verified column
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
        `);

        // 4. Add verification_token column
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS verification_token TEXT;
        `);

        // 5. Add verification_expires column
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS verification_expires TIMESTAMP;
        `);

        // 6. Mark existing users as verified so they can log in immediately
        await client.query(`
            UPDATE users 
            SET is_verified = TRUE 
            WHERE is_verified IS NULL OR is_verified = FALSE;
        `);

        // 7. Add demo phone numbers to demo users if empty
        await client.query(`
            UPDATE users 
            SET phone_number = '+919876543210' 
            WHERE email = 'dhruvil@example.com' AND (phone_number IS NULL OR phone_number = '');
        `);

        await client.query(`
            UPDATE users 
            SET phone_number = '+919876543211' 
            WHERE email = 'bhankharia.dhruvil@eventify.in' AND (phone_number IS NULL OR phone_number = '');
        `);

        // Create index on phone_number if not exists
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
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
