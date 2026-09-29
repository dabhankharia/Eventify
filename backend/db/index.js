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

// Health / Connection verification helper
async function checkDbConnection() {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        isPostgresConnected = true;
        console.log('✓ Successfully connected to PostgreSQL via Drizzle ORM');
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
