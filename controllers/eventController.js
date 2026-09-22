// In-memory Event Data Store (Indian Locations & INR Pricing)
let events = [
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
        description: 'Hands-on masterclass building resilient Node.js Express APIs, JWT authentication layers, Razorpay integration, and high-performance Web apps.',
        bannerGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
        badge: 'Hands-On'
    }
];

// GET /api/events
function getAllEvents(req, res) {
    const { category, search } = req.query;

    let filtered = [...events];

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
}

// GET /api/events/:id
function getEventById(req, res) {
    const event = events.find(e => e.id === req.params.id);
    if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found.' });
    }
    return res.json({ success: true, event });
}

// POST /api/events (Organizer Only)
function createEvent(req, res) {
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
        'linear-gradient(135deg, #f43f5e 0%, #e11d48 50%, #be123c 100%)'
    ];
    const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];

    const newEvent = {
        id: 'evt_' + Date.now().toString(36),
        title: title.trim(),
        category: category.trim(),
        date: date.trim(),
        time: time ? time.trim() : '10:00 AM IST',
        location: location ? location.trim() : 'Bengaluru / Online',
        price: parseFloat(price) || 0,
        availableSeats: parseInt(totalSeats, 10) || 100,
        totalSeats: parseInt(totalSeats, 10) || 100,
        organizer: req.user.fullName || 'Verified Eventify Organizer',
        description: description ? description.trim() : 'No detailed description provided.',
        bannerGradient: randomGradient,
        badge: 'New'
    };

    events.unshift(newEvent);

    return res.status(201).json({
        success: true,
        message: 'Event published successfully to Eventify!',
        event: newEvent
    });
}

// DELETE /api/events/:id (Organizer Only)
function deleteEvent(req, res) {
    const index = events.findIndex(e => e.id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const deleted = events.splice(index, 1);
    return res.json({
        success: true,
        message: 'Event deleted successfully.',
        event: deleted[0]
    });
}

module.exports = {
    events,
    getAllEvents,
    getEventById,
    createEvent,
    deleteEvent
};
