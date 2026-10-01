const express = require('express');
const router = express.Router();
const seed = require('../db/seed');

/**
 * POST /api/admin/seed?secret=YOUR_SEED_SECRET
 *
 * One-time endpoint to populate the database with demo users and sample events.
 * Protected by a secret key so it can't be triggered by random visitors.
 * Safe to call multiple times — seed uses onConflictDoNothing().
 *
 * Usage after deploying on Render (free tier, no Shell needed):
 *   curl -X POST "https://your-app.onrender.com/api/admin/seed?secret=YOUR_SEED_SECRET"
 */
router.post('/seed', async (req, res) => {
    const { secret } = req.query;
    const SEED_SECRET = process.env.SEED_SECRET;

    // Guard: secret must be set in env and must match
    if (!SEED_SECRET) {
        return res.status(500).json({
            success: false,
            message: 'SEED_SECRET is not configured in environment variables.'
        });
    }

    if (secret !== SEED_SECRET) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized. Invalid or missing seed secret.'
        });
    }

    try {
        console.log('🌱 [Admin] Seed endpoint triggered...');
        await seed();
        return res.json({
            success: true,
            message: '✅ Database seeded successfully!',
            seeded: {
                users: [
                    { email: 'dhruvil@example.com', role: 'Attendee', password: 'Password123!' },
                    { email: 'bhankharia.dhruvil@eventify.in', role: 'Organizer', password: 'Password123!' }
                ],
                events: [
                    'India Tech & AI Developer Summit 2026',
                    'Sunburn CyberPulse Music Festival 2026',
                    'SaaS Founder & VC Conclave 2026',
                    'Full-Stack & Cloud Architecture Workshop'
                ]
            }
        });
    } catch (err) {
        console.error('❌ [Admin] Seed failed:', err);
        return res.status(500).json({
            success: false,
            message: 'Seed failed.',
            error: err.message
        });
    }
});

module.exports = router;
