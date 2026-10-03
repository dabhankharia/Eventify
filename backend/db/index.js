const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const schema = require('./schema');

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/eventify';

const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000
});

const db = drizzle(pool, { schema });

let isPostgresConnected = false;

// Auto-migrate tables and verify schema
async function ensureSchemaAndTables() {
    try {
        const client = await pool.connect();
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id VARCHAR(64) PRIMARY KEY,
                    full_name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    password_hash TEXT NOT NULL,
                    role VARCHAR(50) NOT NULL DEFAULT 'Attendee',
                    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
                    verification_token TEXT,
                    verification_expires TIMESTAMP,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS events (
                    id VARCHAR(64) PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    category VARCHAR(100) NOT NULL,
                    date VARCHAR(50) NOT NULL,
                    time VARCHAR(100) NOT NULL,
                    location VARCHAR(255) NOT NULL,
                    price INTEGER NOT NULL DEFAULT 0,
                    available_seats INTEGER NOT NULL DEFAULT 100,
                    total_seats INTEGER NOT NULL DEFAULT 100,
                    organizer VARCHAR(255) NOT NULL,
                    organizer_id VARCHAR(64),
                    description TEXT NOT NULL,
                    banner_gradient TEXT,
                    badge VARCHAR(50) DEFAULT 'Upcoming',
                    created_at TIMESTAMP NOT NULL DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS bookings (
                    id VARCHAR(64) PRIMARY KEY,
                    ticket_code VARCHAR(100) NOT NULL UNIQUE,
                    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    event_id VARCHAR(64) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                    ticket_tier VARCHAR(100) NOT NULL DEFAULT 'General Admission',
                    quantity INTEGER NOT NULL DEFAULT 1,
                    price_per_ticket INTEGER NOT NULL,
                    total_price INTEGER NOT NULL,
                    payment_method VARCHAR(100) NOT NULL,
                    payment_id VARCHAR(100) NOT NULL,
                    status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED',
                    booked_at TIMESTAMP NOT NULL DEFAULT NOW()
                );

                ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_expires TIMESTAMP;
                ALTER TABLE events ADD COLUMN IF NOT EXISTS organizer_id VARCHAR(64);
                ALTER TABLE events ADD COLUMN IF NOT EXISTS banner_gradient TEXT;
                ALTER TABLE events ADD COLUMN IF NOT EXISTS badge VARCHAR(50) DEFAULT 'Upcoming';
            `);
            console.log('✓ PostgreSQL tables & schema verified');

            // Auto-seed if events table is empty
            const countRes = await client.query('SELECT COUNT(*) FROM events');
            const count = parseInt(countRes.rows[0].count, 10);
            if (count === 0) {
                console.log('🌱 No events found in PostgreSQL. Auto-seeding initial events & demo accounts...');
                const seed = require('./seed');
                await seed();
            }
        } finally {
            client.release();
        }
    } catch (err) {
        console.warn('⚠️  Auto-migration notice:', err.message);
    }
}

// Health / Connection verification helper
async function checkDbConnection() {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        isPostgresConnected = true;
        console.log('✓ Successfully connected to PostgreSQL via Drizzle ORM');

        // Automatically ensure tables exist on Render / production
        await ensureSchemaAndTables();
        return true;
    } catch (err) {
        isPostgresConnected = false;
        console.warn('⚠️  PostgreSQL connection check failed:', err.message);
        console.warn('   Running with active Drizzle schema. Ensure PostgreSQL is running on DATABASE_URL.');
        return false;
    }
}

module.exports = {
    db,
    pool,
    schema,
    checkDbConnection,
    isDbConnected: () => isPostgresConnected
};
