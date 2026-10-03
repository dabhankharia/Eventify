const { pgTable, varchar, text, integer, timestamp, boolean } = require('drizzle-orm/pg-core');

// 1. Users Table (Authentication & RBAC)
const users = pgTable('users', {
    id: varchar('id', { length: 64 }).primaryKey(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: varchar('role', { length: 50 }).notNull().default('Attendee'),
    isVerified: boolean('is_verified').default(false).notNull(),
    verificationToken: text('verification_token'),
    verificationExpires: timestamp('verification_expires'),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

// 2. Events Table
const events = pgTable('events', {
    id: varchar('id', { length: 64 }).primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    category: varchar('category', { length: 100 }).notNull(),
    date: varchar('date', { length: 50 }).notNull(),
    time: varchar('time', { length: 100 }).notNull(),
    location: varchar('location', { length: 255 }).notNull(),
    price: integer('price').notNull().default(0),
    availableSeats: integer('available_seats').notNull().default(100),
    totalSeats: integer('total_seats').notNull().default(100),
    organizer: varchar('organizer', { length: 255 }).notNull(),
    organizerId: varchar('organizer_id', { length: 64 }),
    description: text('description').notNull(),
    bannerGradient: text('banner_gradient'),
    badge: varchar('badge', { length: 50 }).default('Upcoming'),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

// 3. Bookings Table (Passes & Payments)
const bookings = pgTable('bookings', {
    id: varchar('id', { length: 64 }).primaryKey(),
    ticketCode: varchar('ticket_code', { length: 100 }).notNull().unique(),
    userId: varchar('user_id', { length: 64 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
    eventId: varchar('event_id', { length: 64 }).notNull().references(() => events.id, { onDelete: 'cascade' }),
    ticketTier: varchar('ticket_tier', { length: 100 }).notNull().default('General Admission'),
    quantity: integer('quantity').notNull().default(1),
    pricePerTicket: integer('price_per_ticket').notNull(),
    totalPrice: integer('total_price').notNull(),
    paymentMethod: varchar('payment_method', { length: 100 }).notNull(),
    paymentId: varchar('payment_id', { length: 100 }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('CONFIRMED'),
    bookedAt: timestamp('booked_at').defaultNow().notNull()
});

module.exports = {
    users,
    events,
    bookings
};
