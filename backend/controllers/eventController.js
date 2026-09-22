const { eq, ilike, or, desc } = require('drizzle-orm');
const { db, schema, isDbConnected } = require('../db');
const { events } = schema;

// In-memory fallback events
let memoryEvents = [
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
        badge: 'Featured',
        createdAt: new Date()
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
        badge: 'Popular',
        createdAt: new Date()
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
        badge: 'Selling Fast',
        createdAt: new Date()
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
        badge: 'Hands-On',
        createdAt: new Date()
    }
];

// GET /api/events
async function getAllEvents(req, res) {
    try {
        const { category, search } = req.query;

        if (isDbConnected()) {
            try {
                let query = db.select().from(events);
                const conditions = [];

                if (category && category !== 'All') {
                    conditions.push(eq(events.category, category));
                }

                if (search && search.trim() !== '') {
                    const searchPattern = `%${search.trim()}%`;
                    conditions.push(
                        or(
                            ilike(events.title, searchPattern),
                            ilike(events.description, searchPattern),
                            ilike(events.location, searchPattern)
                        )
                    );
                }

                if (conditions.length > 0) {
                    const { and } = require('drizzle-orm');
                    query = query.where(and(...conditions));
                }

                const result = await query.orderBy(desc(events.createdAt));
                return res.json({
                    success: true,
                    count: result.length,
                    events: result
                });
            } catch (dbErr) {
                console.warn('PostgreSQL fetch error, falling back to cache:', dbErr.message);
            }
        }

        // Fallback filter
        let filtered = [...memoryEvents];
        if (category && category !== 'All') {
            filtered = filtered.filter(e => e.category.toLowerCase() === category.toLowerCase());
        }
        if (search) {
            const query = search.toLowerCase();
            filtered = filtered.filter(e =>
                e.title.toLowerCase().includes(query) ||
                e.description.toLowerCase().includes(query) ||
                e.location.toLowerCase().includes(query)
            );
        }

        return res.json({
            success: true,
            count: filtered.length,
            events: filtered
        });
    } catch (err) {
        console.error('getAllEvents error:', err);
        return res.status(500).json({ success: false, message: 'Failed to retrieve events.' });
    }
}

// GET /api/events/:id
async function getEventById(req, res) {
    try {
        const { id } = req.params;

        if (isDbConnected()) {
            try {
                const results = await db.select().from(events).where(eq(events.id, id)).limit(1);
                if (results.length > 0) {
                    return res.json({ success: true, event: results[0] });
                }
            } catch (dbErr) {
                console.warn('DB error in getEventById:', dbErr.message);
            }
        }

        const event = memoryEvents.find(e => e.id === id);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found.' });
        }
        return res.json({ success: true, event });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Error retrieving event.' });
    }
}

// POST /api/events (Organizer Only)
async function createEvent(req, res) {
    try {
        const { title, category, date, time, location, price, totalSeats, description } = req.body;

        if (!title || !category || !date || !price || !totalSeats) {
            return res.status(400).json({
                success: false,
                message: 'Title, Category, Date, Price, and Total Seats are required.'
            });
        }

        const gradients = [
            'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
            'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #6366f1 100%)',
            'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
            'linear-gradient(135deg, #f43f5e 0%, #e11d48 50%, #be123c 100%)',
            'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)'
        ];
        const bannerGradient = gradients[Math.floor(Math.random() * gradients.length)];
        const seats = parseInt(totalSeats, 10) || 100;

        const newEvent = {
            id: 'evt_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
            title: title.trim(),
            category: category.trim(),
            date: date.trim(),
            time: time ? time.trim() : '10:00 AM IST',
            location: location ? location.trim() : 'Bengaluru / Online',
            price: Math.round(parseFloat(price)) || 0,
            availableSeats: seats,
            totalSeats: seats,
            organizer: req.user.fullName || 'Verified Eventify Organizer',
            description: description ? description.trim() : 'No detailed description provided.',
            bannerGradient,
            badge: 'New',
            createdAt: new Date()
        };

        if (isDbConnected()) {
            try {
                await db.insert(events).values(newEvent);
            } catch (dbErr) {
                console.warn('DB insertion error, saving to memory cache:', dbErr.message);
                memoryEvents.unshift(newEvent);
            }
        } else {
            memoryEvents.unshift(newEvent);
        }

        return res.status(201).json({
            success: true,
            message: 'Event published successfully to Eventify!',
            event: newEvent
        });
    } catch (err) {
        console.error('createEvent error:', err);
        return res.status(500).json({ success: false, message: 'Server error creating event.' });
    }
}

// DELETE /api/events/:id (Organizer Only)
async function deleteEvent(req, res) {
    try {
        const { id } = req.params;

        if (isDbConnected()) {
            try {
                await db.delete(events).where(eq(events.id, id));
                return res.json({
                    success: true,
                    message: 'Event deleted successfully from PostgreSQL.'
                });
            } catch (dbErr) {
                console.warn('DB delete error:', dbErr.message);
            }
        }

        const index = memoryEvents.findIndex(e => e.id === id);
        if (index === -1) {
            return res.status(404).json({ success: false, message: 'Event not found.' });
        }
        memoryEvents.splice(index, 1);

        return res.json({
            success: true,
            message: 'Event deleted successfully.'
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error deleting event.' });
    }
}

// Internal lookup for booking controller
async function findEventById(id) {
    if (isDbConnected()) {
        try {
            const results = await db.select().from(events).where(eq(events.id, id)).limit(1);
            if (results.length > 0) return results[0];
        } catch (err) {
            console.warn('findEventById db error:', err.message);
        }
    }
    return memoryEvents.find(e => e.id === id) || null;
}

// Internal seat updater
async function updateEventSeats(id, newAvailableSeats) {
    if (isDbConnected()) {
        try {
            await db.update(events).set({ availableSeats: newAvailableSeats }).where(eq(events.id, id));
        } catch (err) {
            console.warn('updateEventSeats db error:', err.message);
        }
    }
    const memEvt = memoryEvents.find(e => e.id === id);
    if (memEvt) {
        memEvt.availableSeats = newAvailableSeats;
    }
}

module.exports = {
    getAllEvents,
    getEventById,
    createEvent,
    deleteEvent,
    findEventById,
    updateEventSeats
};
