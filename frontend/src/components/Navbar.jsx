import React, { useState, useRef, useEffect } from 'react';
import { Compass, Ticket, PlusCircle, User, LogOut, CalendarCheck, Trash2, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ activeTab, setActiveTab, bookingsCount, openAuthModal, onDeleteAccount }) {
    const { currentUser, logout, isOrganizer } = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const getInitials = (name) => {
        if (!name) return 'US';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // Close dropdown on click outside or Escape key
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isDropdownOpen]);

    return (
        <header className="navbar" id="top-navbar">
            <div className="nav-brand" onClick={() => setActiveTab('explore')}>
                <div className="brand-logo-icon">
                    <img src="/favicon.svg" alt="Eventify" className="brand-logo-img" />
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
                {currentUser && isOrganizer && (
                    <button
                        className={`nav-item ${activeTab === 'hosted' ? 'active' : ''}`}
                        onClick={() => setActiveTab('hosted')}
                    >
                        <CalendarCheck size={18} />
                        Hosted Events
                    </button>
                )}
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
                    <div className="user-dropdown-container" ref={dropdownRef}>
                        <button
                            className={`user-pill ${isDropdownOpen ? 'active' : ''}`}
                            onClick={() => setIsDropdownOpen(prev => !prev)}
                            aria-expanded={isDropdownOpen}
                            aria-haspopup="true"
                            title="Account menu"
                        >
                            <div className="user-avatar-sm">
                                {getInitials(currentUser.fullName)}
                            </div>
                            <div className="user-meta">
                                <span className="user-meta-name">{currentUser.fullName}</span>
                                <span className="user-meta-role">{currentUser.role}</span>
                            </div>
                            <ChevronDown
                                size={14}
                                className={`dropdown-chevron ${isDropdownOpen ? 'open' : ''}`}
                            />
                        </button>

                        {isDropdownOpen && (
                            <div className="user-dropdown-menu">
                                {/* Profile Header */}
                                <div className="dropdown-user-header">
                                    <div className="dropdown-user-avatar">
                                        {getInitials(currentUser.fullName)}
                                    </div>
                                    <div className="dropdown-user-info">
                                        <span className="dropdown-name">{currentUser.fullName}</span>
                                        <span className="dropdown-email">{currentUser.email || 'Registered User'}</span>
                                        <span className={`badge-role-tag ${currentUser.role === 'Organizer' ? 'role-organizer' : 'role-attendee'}`}>
                                            {currentUser.role}
                                        </span>
                                    </div>
                                </div>

                                <div className="dropdown-divider" />

                                {/* Navigation items */}
                                <div className="dropdown-nav-section">
                                    <button
                                        className={`dropdown-item ${activeTab === 'bookings' ? 'item-active' : ''}`}
                                        onClick={() => {
                                            setActiveTab('bookings');
                                            setIsDropdownOpen(false);
                                        }}
                                    >
                                        <Ticket size={16} />
                                        <span>My Pass Bookings</span>
                                        {bookingsCount > 0 && (
                                            <span className="dropdown-badge-count">{bookingsCount}</span>
                                        )}
                                    </button>

                                    {isOrganizer && (
                                        <button
                                            className={`dropdown-item ${activeTab === 'hosted' ? 'item-active' : ''}`}
                                            onClick={() => {
                                                setActiveTab('hosted');
                                                setIsDropdownOpen(false);
                                            }}
                                        >
                                            <CalendarCheck size={16} />
                                            <span>Hosted Events</span>
                                        </button>
                                    )}

                                    {isOrganizer && (
                                        <button
                                            className={`dropdown-item ${activeTab === 'organizer' ? 'item-active' : ''}`}
                                            onClick={() => {
                                                setActiveTab('organizer');
                                                setIsDropdownOpen(false);
                                            }}
                                        >
                                            <PlusCircle size={16} />
                                            <span>Organizer Studio</span>
                                        </button>
                                    )}
                                </div>

                                <div className="dropdown-divider" />

                                {/* Sign Out & Account Deletion */}
                                <div className="dropdown-actions-section">
                                    <button
                                        className="dropdown-item dropdown-logout-item"
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            logout();
                                        }}
                                    >
                                        <LogOut size={16} />
                                        <span>Sign Out</span>
                                    </button>

                                    <button
                                        className="dropdown-item dropdown-danger-item"
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            onDeleteAccount();
                                        }}
                                    >
                                        <Trash2 size={16} />
                                        <div className="danger-item-content">
                                            <span>Delete Account</span>
                                            <small>Invalidates all passes</small>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}
