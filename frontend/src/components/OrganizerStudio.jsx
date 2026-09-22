import React, { useState } from 'react';
import { PlusCircle, ShieldAlert, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function OrganizerStudio({ events, onEventCreated, openAuthModal, showToast }) {
    const { currentUser, isOrganizer } = useAuth();

    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('Tech');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [price, setPrice] = useState('');
    const [location, setLocation] = useState('');
    const [totalSeats, setTotalSeats] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Calculate metrics
    const totalEventsCount = events.length;
    const estimatedRevenue = events.reduce((acc, curr) => acc + (curr.price * (curr.totalSeats - curr.availableSeats)), 0);

    const handlePublish = async (e) => {
        e.preventDefault();

        if (!isOrganizer) {
            showToast('Organizer role required to publish events to PostgreSQL.', 'error');
            return;
        }

        setSubmitting(true);
        const token = localStorage.getItem('nexus_jwt_token');

        try {
            const res = await fetch('/api/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title,
                    category,
                    date,
                    time: time || '10:00 AM - 05:00 PM IST',
                    price,
                    location,
                    totalSeats,
                    description
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                showToast('New Event Published to PostgreSQL via Drizzle ORM!', 'success');
                setTitle('');
                setDate('');
                setTime('');
                setPrice('');
                setLocation('');
                setTotalSeats('');
                setDescription('');
                onEventCreated(data.event);
            } else {
                showToast(data.message || 'Failed to publish event', 'error');
            }
        } catch (err) {
            showToast('Error connecting to backend API.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            <div className="organizer-header-card">
                <div>
                    <span className="badge-organizer">Eventify Organizer Portal</span>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Event Creator & Studio Center</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '0.95rem' }}>
                        Publish summits, configure ticket quotas, and monitor live metrics in PostgreSQL. Requires an <strong>Organizer</strong> role.
                    </p>
                </div>

                <div className="organizer-stats">
                    <div className="org-stat-box">
                        <span className="stat-num">{totalEventsCount}</span>
                        <span className="stat-lbl">Active Events</span>
                    </div>
                    <div className="org-stat-box">
                        <span className="stat-num">₹{estimatedRevenue.toLocaleString('en-IN')}</span>
                        <span className="stat-lbl">Ticket Revenue</span>
                    </div>
                </div>
            </div>

            {!isOrganizer && (
                <div className="organizer-restriction-banner">
                    <ShieldAlert size={26} color="#f59e0b" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                        <strong style={{ display: 'block', fontSize: '1rem', marginBottom: '2px' }}>
                            Organizer Privileges Required
                        </strong>
                        <p style={{ fontSize: '0.9rem', color: '#fef3c7' }}>
                            You are currently logged in as an <strong>{currentUser ? currentUser.role : 'Guest'}</strong>.
                            Switch to an <strong>Organizer</strong> account to publish or delete events.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="btn-secondary"
                        style={{ whiteSpace: 'nowrap' }}
                        onClick={() => openAuthModal('login')}
                    >
                        Switch Account
                    </button>
                </div>
            )}

            <div className="create-event-card" style={{ opacity: isOrganizer ? 1 : 0.6, pointerEvents: isOrganizer ? 'auto' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                    <PlusCircle size={22} color="var(--primary-indigo)" />
                    <h3>Create & Publish New Event</h3>
                </div>

                <form onSubmit={handlePublish}>
                    <div className="form-grid-2">
                        <div className="form-group">
                            <label>Event Title</label>
                            <input
                                type="text"
                                placeholder="e.g. NextGen Cloud Architecture Conclave"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Category</label>
                            <select value={category} onChange={(e) => setCategory(e.target.value)}>
                                <option value="Tech">Tech</option>
                                <option value="Music">Music</option>
                                <option value="Business">Business</option>
                                <option value="Workshops">Workshops</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-grid-3">
                        <div className="form-group">
                            <label>Event Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Time & Schedule</label>
                            <input
                                type="text"
                                placeholder="10:00 AM - 05:00 PM IST"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label>Price per Ticket (₹)</label>
                            <input
                                type="number"
                                placeholder="1499"
                                min="0"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-grid-2">
                        <div className="form-group">
                            <label>Venue / City</label>
                            <input
                                type="text"
                                placeholder="e.g. BIEC Bengaluru or Taj Lands End Mumbai"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Total Seat Quota</label>
                            <input
                                type="number"
                                placeholder="250"
                                min="10"
                                value={totalSeats}
                                onChange={(e) => setTotalSeats(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Event Description</label>
                        <textarea
                            rows={3}
                            placeholder="Provide keynote highlights, speaker details, and agenda..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <button type="submit" className="btn-publish" disabled={submitting || !isOrganizer}>
                        <Send size={18} />
                        {submitting ? 'Publishing to PostgreSQL...' : 'Publish Event to Eventify'}
                    </button>
                </form>
            </div>
        </div>
    );
}
