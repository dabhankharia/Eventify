const bcrypt = require('bcryptjs');
const { db, pool, schema } = require('./index');
const { users, events } = schema;

async function seed() {
    console.log('Seeding initial data into PostgreSQL via Drizzle ORM...');

    try {
        const demoPasswordHash = await bcrypt.hash('Password123!', 10);

        // Demo Users
        const initialUsers = [
            {
                id: 'usr_attendee_1',
                fullName: 'Dhruvil Bhankharia',
                email: 'dhruvil@example.com',
                passwordHash: demoPasswordHash,
                role: 'Attendee'
            },
            {
                id: 'usr_organizer_1',
                fullName: 'Bhankharia Dhruvil',
                email: 'bhankharia.dhruvil@eventify.in',
                passwordHash: demoPasswordHash,
                role: 'Organizer'
            }
        ];

        // Demo Events
        const initialEvents = [
            {
                id: 'evt_1',
                title: 'India Tech & AI Developer Summit 2026',
                category: 'Tech',
                date: '2026-10-15',
                time: '09:30 AM - 05:30 PM IST',
                location: 'BIEC Exhibition Centre, Bengaluru',
                price: 1499,
                availableSeats: 85,
                totalSeats: 300,
                organizer: 'Eventify Tech India',
                description: 'Join 2,000+ engineers, founders, and AI practitioners exploring autonomous agents, LLM architectures, and cloud automation.',
                bannerGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
                badge: 'Featured'
            },
            {
                id: 'evt_2',
                title: 'Sunburn CyberPulse Music Festival 2026',
                category: 'Music',
                date: '2026-11-20',
                time: '04:00 PM - 01:00 AM IST',
                location: 'Vagator Beach Arena, Goa',
                price: 2499,
                availableSeats: 140,
                totalSeats: 500,
                organizer: 'Sunburn India Productions',
                description: 'Experience immersive light installations, synthwave performances, and multi-stage electronic music sets on the beaches of Goa.',
                bannerGradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #6366f1 100%)',
                badge: 'Popular'
            },
            {
                id: 'evt_3',
                title: 'SaaS Founder & VC Conclave 2026',
                category: 'Business',
                date: '2026-12-05',
                time: '10:00 AM - 05:00 PM IST',
                location: 'Taj Lands End, Bandra, Mumbai',
                price: 3999,
                availableSeats: 18,
                totalSeats: 100,
                organizer: 'Venture India Network',
                description: 'An exclusive round-table intensive for tech founders scaling SaaS products across India and global markets. Pitch clinics & VC speed-networking.',
                bannerGradient: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
                badge: 'Selling Fast'
            },
            {
                id: 'evt_4',
                title: 'Full-Stack & Cloud Architecture Workshop',
                category: 'Workshops',
                date: '2026-10-28',
                time: '02:00 PM - 06:00 PM IST',
                location: 'DLF CyberCity, Gurugram & Online',
                price: 499,
                availableSeats: 45,
                totalSeats: 150,
                organizer: 'CodeCraft India Academy',
                description: 'Hands-on masterclass building resilient Node.js Express APIs, PostgreSQL with Drizzle ORM, JWT authentication layers, and React frontends.',
                bannerGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
                badge: 'Hands-On'
            }
        ];

        console.log('Inserting seed users...');
        for (const u of initialUsers) {
            await db.insert(users).values(u).onConflictDoNothing();
        }

        console.log('Inserting seed events...');
        for (const e of initialEvents) {
            await db.insert(events).values(e).onConflictDoNothing();
        }

        console.log('✓ Database seeded successfully!');
    } catch (err) {
        console.error('Seed error:', err);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    seed();
}

module.exports = seed;
