const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/authMiddleware');

// In-memory User Data Store (Pre-seeded with demo attendee & organizer)
const demoPasswordHash = bcrypt.hashSync('Password123!', 10);

const users = [
    {
        id: 'usr_attendee_1',
        fullName: 'Dhruvil Bhankharia',
        email: 'dhruvil@example.com',
        passwordHash: demoPasswordHash,
        role: 'Attendee',
        createdAt: new Date().toISOString()
    },
    {
        id: 'usr_organizer_1',
        fullName: 'Bhankharia Dhruvil',
        email: 'bhankharia.dhruvil@eventify.in',
        passwordHash: demoPasswordHash,
        role: 'Organizer',
        createdAt: new Date().toISOString()
    }
];

function findUserByEmail(email) {
    return users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

function findUserById(id) {
    return users.find(u => u.id === id);
}

// Register User
async function register(req, res) {
    try {
        const { fullName, email, password, role } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Full Name, Email, and Password are required.'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address.'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters.'
            });
        }

        if (findUserByEmail(email)) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email already exists.'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = {
            id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            passwordHash,
            role: role === 'Organizer' ? 'Organizer' : 'Attendee',
            createdAt: new Date().toISOString()
        };

        users.push(newUser);

        const token = jwt.sign(
            { id: newUser.id, email: newUser.email, fullName: newUser.fullName, role: newUser.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        return res.status(201).json({
            success: true,
            message: 'Account created successfully on Eventify!',
            token,
            user: {
                id: newUser.id,
                fullName: newUser.fullName,
                email: newUser.email,
                role: newUser.role,
                createdAt: newUser.createdAt
            }
        });
    } catch (err) {
        console.error('Registration error:', err);
        return res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
}

// Login User
async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and Password are required.'
            });
        }

        const user = findUserByEmail(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        return res.json({
            success: true,
            message: 'Sign in successful!',
            token,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ success: false, message: 'Server error during login.' });
    }
}

// Get Profile
function getMe(req, res) {
    const user = findUserById(req.user.id);
    if (!user) {
        return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    return res.json({
        success: true,
        user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt
        }
    });
}

module.exports = {
    register,
    login,
    getMe
};
