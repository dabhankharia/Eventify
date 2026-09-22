import React from 'react';
import { Compass, Ticket, PlusCircle, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ activeTab, setActiveTab, bookingsCount, openAuthModal }) {
    const { currentUser, logout } = useAuth();

    const getInitials = (name) => {
        if (!name) return 'US';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <header className="navbar" id="top-navbar">
            <div className="nav-brand" onClick={() => setActiveTab('explore')}>
                <div className="brand-logo-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                        <path d="M8 14h.01" />
                        <path d="M12 14h.01" />
                        <path d="M16 14h.01" />
                        <path d="M8 18h.01" />
                        <path d="M12 18h.01" />
                    </svg>
                </div>
                <span className="brand-title">Event<span className="brand-highlight">ify</span></span>
            </div>

            <nav className="nav-links">
                <button
                    className={`nav-item ${activeTab === 'explore' ? 'active' : ''}`}
                    onClick={() => setActiveTab('explore')}
                >
                    <Compass size={18} />
                    Explore Events
                </button>
                <button
                    className={`nav-item ${activeTab === 'bookings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('bookings')}
                >
                    <Ticket size={18} />
                    My Pass Bookings
                    {bookingsCount > 0 && (
                        <span className="badge-count">{bookingsCount}</span>
                    )}
                </button>
                <button
                    className={`nav-item ${activeTab === 'organizer' ? 'active' : ''}`}
                    onClick={() => setActiveTab('organizer')}
                >
                    <PlusCircle size={18} />
                    Organizer Studio
                </button>
            </nav>

            <div className="nav-auth-area">
                {!currentUser ? (
                    <button className="btn-signin-nav" onClick={() => openAuthModal('login')}>
                        <User size={18} />
                        Sign In / Register
                    </button>
                ) : (
                    <div className="user-pill">
                        <div className="user-avatar-sm">
                            {getInitials(currentUser.fullName)}
                        </div>
                        <div className="user-meta">
                            <span className="user-meta-name">{currentUser.fullName}</span>
                            <span className="user-meta-role">{currentUser.role}</span>
                        </div>
                        <button
                            className="btn-logout-icon"
                            onClick={logout}
                            title="Sign out of Eventify"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}
