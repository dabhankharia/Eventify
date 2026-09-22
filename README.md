# 🎟️ Eventify — Full-Stack Event Booking & Management Platform

[![Stack](https://img.shields.io/badge/Stack-PostgreSQL%20%7C%20Drizzle%20%7C%20Express%20%7C%20React-blue.svg)](https://github.com/dabhankharia/Eventify)
[![Authentication](https://img.shields.io/badge/Auth-JWT%20%2B%20Bcrypt-green.svg)](https://jwt.io/)
[![ORM](https://img.shields.io/badge/ORM-Drizzle%20ORM-orange.svg)](https://orm.drizzle.team/)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite%20%28JS%29-cyan.svg)](https://vitejs.dev/)

**Eventify** is a modern, production-grade full-stack event booking and management platform built with **PostgreSQL**, **Drizzle ORM**, **Express.js**, **Node.js**, and **React (JavaScript + Vite)**. It features role-based JWT authentication, multi-tier ticket reservations, interactive Razorpay payment simulation, dynamic scannable QR ticket passes, and a dedicated Organizer Studio.

---

## 🏛️ System Architecture

```mermaid
graph LR
    subgraph Frontend ["Frontend (React + Vite SPA)"]
        UI["Glassmorphic UI"]
        AuthCtx["AuthContext (JWT + User State)"]
        Modals["Booking, Pass & Razorpay Modals"]
        Studio["Organizer Studio"]
    end

    subgraph Backend ["Backend (Node.js + Express API)"]
        Routes["API Routes (/api/auth, /api/events, /api/bookings)"]
        Middleware["JWT Verification & Role Guard"]
        Controllers["Auth, Event & Booking Controllers"]
    end

    subgraph Database ["Database Layer (PostgreSQL + Drizzle ORM)"]
        Drizzle["Drizzle ORM (node-postgres)"]
        DBSchema["Schema (users, events, bookings)"]
        PG[(PostgreSQL Database)]
    end

    UI -->|HTTP Requests / Proxy| Routes
    Routes --> Middleware --> Controllers
    Controllers --> Drizzle
    Drizzle --> DBSchema --> PG
```

---

## 📁 Clean Separated Monorepo Structure

```text
event-booking-app/
├── backend/                      # Node.js + Express.js REST API
│   ├── controllers/              # Request Controllers
│   │   ├── authController.js     # Register, Login (bcrypt + JWT), Profile
│   │   ├── bookingController.js  # Ticket reservation, seat deduction & restitution
│   │   └── eventController.js    # Event CRUD, Category & Keyword Search queries
│   ├── db/                       # Database & Drizzle ORM
│   │   ├── index.js              # PostgreSQL connection pool & Drizzle client
│   │   ├── schema.js             # Drizzle PostgreSQL schema (users, events, bookings)
│   │   └── seed.js               # Seed script for demo accounts & Indian events
│   ├── drizzle/                  # Generated Drizzle SQL migrations
│   │   └── 0000_good_sunset_bain.sql
│   ├── middleware/
│   │   └── authMiddleware.js     # JWT extraction & role-based guards (requireOrganizer)
│   ├── routes/                   # Express REST Route Handlers
│   │   ├── authRoutes.js         # /api/auth routes
│   │   ├── bookingRoutes.js      # /api/bookings routes
│   │   └── eventRoutes.js        # /api/events routes
│   ├── .env.example              # Backend environment template
│   ├── drizzle.config.js         # Drizzle Kit migration & studio config
│   ├── package.json              # Backend dependencies & scripts
│   └── server.js                 # Express server & static SPA serving
│
├── frontend/                     # React Single Page Application (Vite + JavaScript)
│   ├── public/                   # Public assets & icons
│   ├── src/
│   │   ├── components/           # Modular React UI Components
│   │   │   ├── AuthModal.jsx     # Sign In & Register Modal with 1-click demo login
│   │   │   ├── BookingModal.jsx  # Multi-tier ticket selection & counter
│   │   │   ├── BookingsView.jsx  # Attendee's reserved pass inventory
│   │   │   ├── EventCard.jsx     # Event card with category badge & available seats
│   │   │   ├── EventsGrid.jsx    # Dynamic event grid with search & category filters
│   │   │   ├── Hero.jsx          # Hero banner with search bar & category pills
│   │   │   ├── Navbar.jsx        # App header, role badge, user profile pill
│   │   │   ├── OrganizerStudio.jsx # Event creation portal & revenue metrics
│   │   │   ├── PassModal.jsx     # Scannable dynamic QR digital ticket pass
│   │   │   ├── RazorpayModal.jsx # Simulated UPI/Card/Netbanking checkout
│   │   │   └── Toast.jsx         # Animated notification alerts
│   │   ├── context/
│   │   │   └── AuthContext.jsx   # React Context for JWT auth & role state
│   │   ├── App.jsx               # Main application orchestrator
│   │   ├── index.css             # Glassmorphism dark mode design system
│   │   └── main.jsx              # React root mount
│   ├── index.html                # Frontend HTML entry point
│   ├── package.json              # Frontend dependencies & scripts
│   └── vite.config.js            # Vite config with /api proxy to backend
│
├── .env.example                  # Root environment template
├── .gitignore                    # Comprehensive repository gitignore
├── package.json                  # Root monorepo orchestrator (concurrently)
└── README.md                     # Documentation
```

---

## ⚡ Tech Stack Details

| Layer | Technologies Used | Description |
| :--- | :--- | :--- |
| **Frontend** | React 19, JavaScript (ESNext), Vite | High-performance Single Page Application |
| **Icons & QR** | Lucide React, QRCode.react | Sleek iconography and dynamic high-density QR code rendering |
| **Styling** | Modern Vanilla CSS | Curated color system, glassmorphism, responsive grid layouts |
| **Backend** | Node.js, Express.js 4.x | RESTful API with structured routes and modular controllers |
| **Database** | PostgreSQL | Robust relational database for transactional integrity |
| **ORM** | Drizzle ORM (`drizzle-orm`, `drizzle-kit`, `pg`) | Type-safe SQL-like queries and automated migrations |
| **Authentication** | JWT (`jsonwebtoken`), Bcrypt (`bcryptjs`) | Stateless bearer token authentication with role enforcement |
| **Monorepo Tools** | `concurrently` | Simultaneous backend & frontend development commands |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18.0 or newer)
- **npm** (v9.0 or newer)
- **PostgreSQL** (Local instance or cloud provider like Supabase / Neon)

### 2. Installation

Clone the repository and install all dependencies in one step:

```bash
# Clone the repository
git clone https://github.com/dabhankharia/Eventify.git
cd Eventify

# Install root, backend, and frontend dependencies all at once:
npm run install:all
```

*(Alternatively, install each workspace individually with `npm install`, `npm --prefix backend install`, and `npm --prefix frontend install`).*

### 3. Configure Environment Variables

Create your backend environment configuration:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your PostgreSQL database credentials and JWT secret:

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=eventify_jwt_super_secure_2026_key_#12903!
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/eventify
```

> **Note**: The application includes graceful database fallback. If PostgreSQL is offline during development, the API maintains active Drizzle schemas with an in-memory cache so you can immediately preview all UI features!

### 4. Database Setup (Drizzle ORM)

```bash
# Push schema directly to your PostgreSQL database
npm run db:push

# Seed demo users and initial premier events
npm run db:seed

# Optional: Open Drizzle Studio to inspect and manage tables in your browser
npm run db:studio
```

### 5. Running the Application

#### Concurrent Development (Recommended)
Run both the Express API and the Vite React development server together:

```bash
npm run dev
```
- **Backend API**: `http://localhost:3001`
- **Frontend SPA**: `http://localhost:5173` (with `/api` proxy to 3001)

#### Running Workspaces Separately
```bash
# Terminal 1 - Backend Server
npm run dev:backend

# Terminal 2 - React Frontend (Vite)
npm run dev:frontend
```

### 6. Production Build & Serving

```bash
# Build the production React SPA into frontend/dist
npm run build

# Start the Node.js production server (serves API and compiled React SPA)
npm start
```

Access the application in your browser at **`http://localhost:3001`**.

---

## 👥 Pre-Seeded Demo Credentials

Use the **1-Click Quick Fill** buttons in the Sign In modal to test both roles:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Attendee** | `dhruvil@example.com` | `Password123!` | Browse events, reserve passes, view digital QR tickets, cancel bookings |
| **Organizer** | `bhankharia.dhruvil@eventify.in` | `Password123!` | All attendee permissions + access to Organizer Studio, publish events, delete events |

---

## 🔌 REST API Reference

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new account (`fullName`, `email`, `password`, `role`) |
| `POST` | `/api/auth/login` | Public | Authenticate user & issue signed JWT token |
| `GET` | `/api/auth/me` | Protected | Fetch authenticated user profile |

### 🎪 Events (`/api/events`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/events` | Public | List all events (supports `?category=` & `?search=`) |
| `GET` | `/api/events/:id` | Public | Get details for a single event |
| `POST` | `/api/events` | Organizer | Publish new event to PostgreSQL database |
| `DELETE` | `/api/events/:id` | Organizer | Delete an event |

### 🎟️ Bookings (`/api/bookings`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/bookings` | Protected | Reserve tickets, decrement seats in PostgreSQL, generate digital pass |
| `GET` | `/api/bookings/my` | Protected | List all passes reserved by the authenticated user |
| `DELETE` | `/api/bookings/:id` | Protected | Cancel booking and restore available seats |

### 🩺 Health & Diagnostic (`/api/health`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | System status, ORM state, and database connectivity diagnostic |

---

## 💎 Key Features Highlight

1. **Role-Based Access Control (RBAC)**: Secure routes protected with JWT verification and `requireOrganizer` middleware.
2. **Multi-Tier Ticketing**:
   - `General Admission`: Standard 1.0x price
   - `VIP All-Access Pass`: 1.6x price with premium lounge benefits
   - `Early Bird Discount`: 0.85x price (15% savings)
3. **Dynamic Scannable QR Codes**: Real-time high-density QR code rendered directly onto a printable digital pass.
4. **Interactive Payment Gateways**: Simulated Razorpay modal supporting UPI apps (GPay, PhonePe, Paytm, BHIM), Cards, Netbanking, plus 1-Click Free Presentation Demo mode.
5. **Transactional Inventory**: Automatic seat decrementing upon booking and automatic seat restitution upon cancellation.
6. **Unified Monorepo Architecture**: Clean separation of frontend and backend workspaces with root orchestration scripts.

---

## 📜 License
Distributed under the MIT License. Built with ❤️ for developers and event organizers.
