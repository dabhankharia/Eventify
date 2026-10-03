const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { eq, or } = require('drizzle-orm');
const { db, schema, isDbConnected } = require('../db');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const notificationService = require('../services/notificationService');

const { users, events } = schema;

// In-Memory fallback store for demo / offline development
const fallbackPasswordHash = bcrypt.hashSync('Password123!', 10);
const memoryUsers = [
    {
        id: 'usr_attendee_1',
        fullName: 'Dhruvil Bhankharia',
        email: 'dhruvil@example.com',
        passwordHash: fallbackPasswordHash,
        role: 'Attendee',
        isVerified: true,
        verificationToken: null,
        verificationExpires: null,
        createdAt: new Date()
    },
    {
        id: 'usr_organizer_1',
        fullName: 'Bhankharia Dhruvil',
        email: 'bhankharia.dhruvil@eventify.in',
        passwordHash: fallbackPasswordHash,
        role: 'Organizer',
        isVerified: true,
        verificationToken: null,
        verificationExpires: null,
        createdAt: new Date()
    }
];

// Helper to look up user by email
async function findUserByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    if (isDbConnected()) {
        try {
            const results = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
            return results[0] || null;
        } catch (err) {
            console.warn('Drizzle query error in findUserByEmail, falling back:', err.message);
        }
    }
    return memoryUsers.find(u => u.email && u.email.toLowerCase() === cleanEmail) || null;
}

// Helper to look up user by verification token
async function findUserByToken(token) {
    if (!token) return null;
    if (isDbConnected()) {
        try {
            const results = await db.select().from(users).where(eq(users.verificationToken, token)).limit(1);
            return results[0] || null;
        } catch (err) {
            console.warn('Drizzle query error in findUserByToken, falling back:', err.message);
        }
    }
    return memoryUsers.find(u => u.verificationToken === token) || null;
}

// Helper to look up user by id
async function findUserById(id) {
    if (isDbConnected()) {
        try {
            const results = await db.select().from(users).where(eq(users.id, id)).limit(1);
            return results[0] || null;
        } catch (err) {
            console.warn('Drizzle query error in findUserById, falling back:', err.message);
        }
    }
    return memoryUsers.find(u => u.id === id) || null;
}

// POST /api/auth/register
async function register(req, res) {
    try {
        const { fullName, email, password, role } = req.body;

        if (!fullName || !fullName.trim()) {
            return res.status(400).json({ success: false, message: 'Full name is required.' });
        }

        if (!email || !email.trim()) {
            return res.status(400).json({ success: false, message: 'Email address is required.' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
        }

        if (!password || password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long.'
            });
        }

        const cleanEmailVal = email.trim().toLowerCase();

        // Generate verification token and expiration (24h)
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Check duplicate email
        const existingUser = await findUserByEmail(cleanEmailVal);
        let userRecord = null;

        if (existingUser) {
            if (existingUser.isVerified) {
                return res.status(409).json({
                    success: false,
                    message: 'An account with this email address already exists. Please sign in.'
                });
            }

            // Existing unverified user: update password and token rather than throwing duplicate key violation
            if (isDbConnected()) {
                try {
                    await db.update(users)
                        .set({
                            fullName: fullName.trim(),
                            passwordHash,
                            role: role === 'Organizer' ? 'Organizer' : 'Attendee',
                            verificationToken,
                            verificationExpires
                        })
                        .where(or(eq(users.id, existingUser.id), eq(users.email, cleanEmailVal)));
                } catch (dbErr) {
                    console.warn('Could not update unverified user in PostgreSQL:', dbErr.message);
                }
            }

            const memUser = memoryUsers.find(u => u.email && u.email.toLowerCase() === cleanEmailVal);
            if (memUser) {
                memUser.fullName = fullName.trim();
                memUser.passwordHash = passwordHash;
                memUser.role = role === 'Organizer' ? 'Organizer' : 'Attendee';
                memUser.verificationToken = verificationToken;
                memUser.verificationExpires = verificationExpires;
            }

            userRecord = {
                id: existingUser.id,
                fullName: fullName.trim(),
                email: cleanEmailVal,
                role: role === 'Organizer' ? 'Organizer' : 'Attendee',
                isVerified: false
            };
        } else {
            const newUser = {
                id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
                fullName: fullName.trim(),
                email: cleanEmailVal,
                passwordHash,
                role: role === 'Organizer' ? 'Organizer' : 'Attendee',
                isVerified: false,
                verificationToken,
                verificationExpires,
                createdAt: new Date()
            };

            if (isDbConnected()) {
                try {
                    await db.insert(users).values(newUser);
                } catch (dbErr) {
                    console.warn('Could not insert to PostgreSQL, persisting to memory cache:', dbErr.message);
                    memoryUsers.push(newUser);
                }
            } else {
                memoryUsers.push(newUser);
            }

            userRecord = newUser;
        }

        // Determine base URL for confirmation link
        const hostHeader = req.get('host') || 'localhost:3001';
        const isLocal = hostHeader.includes('localhost') || hostHeader.includes('127.0.0.1');
        const frontendBaseUrl = isLocal ? 'http://localhost:5173' : `${req.protocol}://${hostHeader}`;
        const verificationLink = `${frontendBaseUrl}/?verify_token=${verificationToken}`;

        // Send Email confirmation link
        await notificationService.sendRegistrationConfirmation({
            recipient: {
                fullName: userRecord.fullName,
                email: userRecord.email
            },
            verificationLink
        });

        return res.status(201).json({
            success: true,
            requiresVerification: true,
            message: `Registration initiated! We sent a confirmation link to ${userRecord.email}. Please click the link in your email to activate your account.`,
            recipient: userRecord.email,
            user: {
                id: userRecord.id,
                fullName: userRecord.fullName,
                email: userRecord.email,
                role: userRecord.role,
                isVerified: false
            }
        });
    } catch (err) {
        console.error('Registration error:', err);
        return res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
}

// GET or POST /api/auth/verify
async function verifyRegistration(req, res) {
    try {
        const token = req.query.token || req.body?.token;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Verification token is missing.'
            });
        }

        const user = await findUserByToken(token);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired confirmation link. Please request a new confirmation link.'
            });
        }

        if (user.verificationExpires && new Date(user.verificationExpires) < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'This confirmation link has expired (valid for 24 hours). Please request a new confirmation link.'
            });
        }

        // Finalize registration
        if (isDbConnected()) {
            try {
                const resUpdate = await db.update(users)
                    .set({
                        isVerified: true,
                        verificationToken: null,
                        verificationExpires: null
                    })
                    .where(or(eq(users.id, user.id), eq(users.email, user.email.toLowerCase().trim())))
                    .returning();
                console.log(`✅ [Eventify Auth] Verified user in PostgreSQL: ${user.email} (rows updated: ${resUpdate.length})`);
            } catch (dbErr) {
                console.error('❌ DB error finalizing verification:', dbErr.message);
            }
        }

        // Also update memory record if present
        const memUser = memoryUsers.find(u => u.id === user.id || (u.email && u.email.toLowerCase() === user.email.toLowerCase()));
        if (memUser) {
            memUser.isVerified = true;
            memUser.verificationToken = null;
            memUser.verificationExpires = null;
        }

        // Sign JWT
        const jwtToken = jwt.sign(
            {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        const acceptsHtml = req.headers.accept && req.headers.accept.includes('text/html');
        if (req.method === 'GET' && acceptsHtml) {
            const hostHeader = req.get('host') || 'localhost:3001';
            const isLocal = hostHeader.includes('localhost') || hostHeader.includes('127.0.0.1');
            const frontendBaseUrl = isLocal ? 'http://localhost:5173' : `${req.protocol}://${hostHeader}`;
            return res.redirect(`${frontendBaseUrl}/?verified=success&token=${jwtToken}&name=${encodeURIComponent(user.fullName)}`);
        }

        return res.json({
            success: true,
            message: '🎉 Congratulations! Your Eventify registration is confirmed and your account is active.',
            token: jwtToken,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                isVerified: true
            }
        });
    } catch (err) {
        console.error('Verification error:', err);
        return res.status(500).json({ success: false, message: 'Server error during confirmation.' });
    }
}

// POST /api/auth/resend-verification
async function resendVerification(req, res) {
    try {
        const { identifier, email } = req.body;
        const targetEmail = identifier || email;
        if (!targetEmail) {
            return res.status(400).json({ success: false, message: 'Email address is required.' });
        }

        const user = await findUserByEmail(targetEmail);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Account not found with this email address.' });
        }

        if (user.isVerified) {
            return res.status(400).json({ success: false, message: 'This account is already verified. You can sign in.' });
        }

        const newToken = crypto.randomBytes(32).toString('hex');
        const newExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        if (isDbConnected()) {
            await db.update(users)
                .set({ verificationToken: newToken, verificationExpires: newExpires })
                .where(or(eq(users.id, user.id), eq(users.email, user.email.toLowerCase().trim())));
        }

        const memUser = memoryUsers.find(u => u.id === user.id || (u.email && u.email.toLowerCase() === user.email.toLowerCase()));
        if (memUser) {
            memUser.verificationToken = newToken;
            memUser.verificationExpires = newExpires;
        }

        const hostHeader = req.get('host') || 'localhost:3001';
        const isLocal = hostHeader.includes('localhost') || hostHeader.includes('127.0.0.1');
        const frontendBaseUrl = isLocal ? 'http://localhost:5173' : `${req.protocol}://${hostHeader}`;
        const verificationLink = `${frontendBaseUrl}/?verify_token=${newToken}`;

        await notificationService.sendRegistrationConfirmation({
            recipient: {
                fullName: user.fullName,
                email: user.email
            },
            verificationLink
        });

        return res.json({
            success: true,
            message: 'A new confirmation link has been sent to your email address.'
        });
    } catch (err) {
        console.error('Resend verification error:', err);
        return res.status(500).json({ success: false, message: 'Server error resending confirmation.' });
    }
}

// POST /api/auth/login
async function login(req, res) {
    try {
        const { email, identifier, password } = req.body;
        const targetEmail = email || identifier;

        if (!targetEmail || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and Password are required.'
            });
        }

        const user = await findUserByEmail(targetEmail);
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

        console.log(`[Eventify Login] Attempt for: ${user.email}, isVerified: ${user.isVerified}`);

        // Check verification status
        if (user.isVerified === false) {
            return res.status(403).json({
                success: false,
                unverified: true,
                message: 'Your registration is not confirmed yet. Please click the confirmation link sent to your email.',
                identifier: user.email
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        return res.json({
            success: true,
            message: `Welcome back, ${user.fullName}!`,
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

// GET /api/auth/me
async function getMe(req, res) {
    try {
        const user = await findUserById(req.user.id);
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
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch user profile.' });
    }
}

// DELETE /api/auth/me  (Any authenticated user — deletes account + cascades bookings)
async function deleteAccount(req, res) {
    try {
        const userId = req.user.id;
        const targetUser = await findUserById(userId);

        if (isDbConnected()) {
            try {
                // Delete any events hosted by this user (their bookings cascade via FK onDelete: 'cascade')
                await db.delete(events).where(eq(events.organizerId, userId));
                // Delete user (user's own ticket bookings cascade automatically via FK onDelete: 'cascade')
                await db.delete(users).where(eq(users.id, userId));
            } catch (dbErr) {
                console.warn('DB error deleting account:', dbErr.message);
                return res.status(500).json({ success: false, message: 'Failed to delete account from database.' });
            }
        }

        // Also purge from in-memory fallback
        const idx = memoryUsers.findIndex(u => u.id === userId);
        if (idx !== -1) memoryUsers.splice(idx, 1);

        // Send "Sorry to see you go" email notice (skipped for demo addresses)
        if (targetUser && targetUser.email) {
            try {
                await notificationService.sendAccountDeletionNotice({
                    recipient: {
                        fullName: targetUser.fullName,
                        email: targetUser.email
                    }
                });
            } catch (mailErr) {
                console.warn('Failed to dispatch account deletion email notice:', mailErr.message);
            }
        }

        return res.json({
            success: true,
            message: 'Your account and all associated bookings have been permanently deleted.'
        });
    } catch (err) {
        console.error('deleteAccount error:', err);
        return res.status(500).json({ success: false, message: 'Server error deleting account.' });
    }
}

module.exports = {
    register,
    verifyRegistration,
    resendVerification,
    login,
    getMe,
    deleteAccount,
    findUserById
};
