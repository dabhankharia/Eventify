import React from 'react';
import { Calendar, MapPin, QrCode, Trash2, Compass } from 'lucide-react';

export default function BookingsView({ bookings, onViewPass, onCancelBooking, setActiveTab }) {
    if (bookings.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <h3 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '8px' }}>No active ticket passes</h3>
                <p style={{ marginBottom: '20px' }}>
                    Browse premier Indian events and reserve your digital pass today!
                </p>
                <button
                    className="btn-primary"
                    style={{ maxWidth: '220px', margin: '0 auto' }}
                    onClick={() => setActiveTab('explore')}
                >
                    <Compass size={18} />
                    Explore Events
                </button>
            </div>
        );
    }

    return (
        <div>
            <div className="section-header border-bottom">
                <div>
                    <h2>My Event Pass Bookings</h2>
                    <p className="section-desc">
                        Manage your confirmed tickets, view dynamic scannable QR passes, or cancel bookings.
                    </p>
                </div>
            </div>

            <div className="bookings-grid">
                {bookings.map((b) => (
                    <div key={b.id} className="booking-card">
                        <div className="booking-card-header">
                            <div>
                                <span className="booking-ticket-code">{b.ticketCode}</span>
                                <h3 style={{ fontSize: '1.1rem', marginTop: '6px', color: '#fff' }}>
                                    {b.eventTitle}
                                </h3>
                            </div>
                            <span className="booking-status">{b.status || 'CONFIRMED'}</span>
                        </div>

                        <div className="evt-card-details">
                            <div className="evt-detail-row">
                                <Calendar size={15} color="var(--text-subtle)" />
                                <span>{b.eventDate} • {b.eventTime}</span>
                            </div>
                            <div className="evt-detail-row">
                                <MapPin size={15} color="var(--text-subtle)" />
                                <span>{b.eventLocation}</span>
                            </div>
                            <div className="evt-detail-row" style={{ justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                                    {b.ticketTier} (x{b.quantity})
                                </span>
                                <span style={{ fontWeight: 700, color: '#fff' }}>
                                    Total: ₹{Number(b.totalPrice).toLocaleString('en-IN')}
                                </span>
                            </div>
                        </div>

                        <div className="booking-actions">
                            <button
                                className="btn-secondary"
                                style={{ flex: 1 }}
                                onClick={() => onViewPass(b)}
                            >
                                <QrCode size={16} />
                                View Digital Pass
                            </button>
                            <button
                                className="btn-danger-sm"
                                onClick={() => onCancelBooking(b.id)}
                                title="Cancel booking pass"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
