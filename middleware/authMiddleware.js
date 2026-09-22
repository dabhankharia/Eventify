const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'event_nexus_super_secret_jwt_key_2026';

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required. Please sign in to continue.'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({
            success: false,
            message: 'Session expired or invalid token. Please log in again.'
        });
    }
}

function requireOrganizer(req, res, next) {
    if (!req.user || (req.user.role !== 'Organizer' && req.user.role !== 'Admin')) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Organizer or Admin privileges required.'
        });
    }
    next();
}

module.exports = {
    authenticateToken,
    requireOrganizer,
    JWT_SECRET
};
