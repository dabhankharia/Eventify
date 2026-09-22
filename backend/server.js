const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const { checkDbConnection, isDbConnected } = require('./db');
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);

// Health check route
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        app: 'Eventify - Full-Stack Event Booking & Management Platform',
        orm: 'Drizzle ORM (PostgreSQL)',
        frontend: 'React (JavaScript + Vite)',
        dbConnected: isDbConnected(),
        authSystem: 'JWT + bcryptjs Role-Based Access Control',
        serverTime: new Date().toISOString()
    });
});

// Serve compiled React frontend if built (frontend/dist)
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');

if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
}

// Start Server
app.listen(PORT, async () => {
    console.log(`================================================================`);
    console.log(` 🚀 Eventify Full-Stack Platform running on http://localhost:${PORT}`);
    console.log(` 📦 Stack: Node.js + Express + Drizzle ORM + PostgreSQL + React`);
    console.log(` 🔑 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`================================================================`);

    // Verify DB Connection
    await checkDbConnection();
});

module.exports = app;
