import React from 'react';
import { Calendar, MapPin, Users, Trash2, PlusCircle, TrendingUp } from 'lucide-react';

export default function HostedEventsView({ events, onDelete, onGoCreateEvent }) {
    const totalRevenue = events.reduce((acc, e) => acc + (e.price * (e.totalSeats - e.availableSeats)), 0);
    const totalAttendees = events.reduce((acc, e) => acc + (e.totalSeats - e.availableSeats), 0);

    if (events.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎪</div>
                <h3 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '8px' }}>No events hosted yet</h3>
                <p style={{ marginBottom: '24px' }}>
                    Head to the Organizer Studio to publish your first event!
                </p>
                <button
                    className="btn-primary"
                    style={{ maxWidth: '240px', margin: '0 auto' }}
                    onClick={onGoCreateEvent}
                >
                    <PlusCircle size={18} />
                    Create an Event
                </button>
            </div>
        );
    }

    return (
        <div>
            <div className="section-header border-bottom">
                <div>
                    <h2>Hosted Events</h2>
                    <p className="section-desc">
                        Manage events you've published. View bookings, track revenue, or remove a listing.
                    </p>
                </div>
            </div>

            {/* Summary stats bar */}
            <div style={{
                display: 'flex',
                gap: '16px',
                margin: '24px 0',
                flexWrap: 'wrap'
            }}>
                {[
                    { label: 'Events Hosted', value: events.length, color: '#6366f1' },
                    { label: 'Total Attendees', value: totalAttendees.toLocaleString('en-IN'), color: '#06b6d4' },
                    { label: 'Ticket Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, color: '#10b981' },
                ].map(stat => (
                    <div key={stat.label} style={{
                        flex: '1 1 160px',
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        padding: '16px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                    }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: stat.color }}>{stat.value}</span>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{stat.label}</span>
                    </div>
                ))}
            </div>

            <div className="bookings-grid">
                {events.map((event) => {
                    const sold = event.totalSeats - event.availableSeats;
                    const fillPct = Math.round((sold / event.totalSeats) * 100);
                    return (
                        <div key={event.id} className="booking-card">
                            {/* Coloured banner strip */}
                            <div style={{
                                height: '6px',
                                background: event.bannerGradient || 'linear-gradient(135deg,#6366f1,#d946ef)',
                                borderRadius: '8px 8px 0 0',
                                margin: '-1px -1px 0'
                            }} />

                            <div className="booking-card-header" style={{ marginTop: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                                        <span className="badge-cat" style={{ fontSize: '0.72rem' }}>{event.category}</span>
                                        {event.badge && (
                                            <span className="badge-tag" style={{ fontSize: '0.72rem' }}>{event.badge}</span>
                                        )}
                                    </div>
                                    <h3 style={{ fontSize: '1.05rem', color: '#fff', lineHeight: 1.3 }}>{event.title}</h3>
                                </div>
                            </div>

                            <div className="evt-card-details" style={{ marginTop: '10px' }}>
                                <div className="evt-detail-row">
                                    <Calendar size={14} color="var(--text-subtle)" />
                                    <span>{event.date} • {event.time}</span>
                                </div>
                                <div className="evt-detail-row">
                                    <MapPin size={14} color="var(--text-subtle)" />
                                    <span>{event.location}</span>
                                </div>
                                <div className="evt-detail-row">
                                    <Users size={14} color="var(--text-subtle)" />
                                    <span>{sold} / {event.totalSeats} seats sold</span>
                                </div>
                            </div>

                            {/* Fill progress bar */}
                            <div style={{ margin: '12px 0 4px' }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '0.75rem',
                                    color: 'var(--text-muted)',
                                    marginBottom: '6px'
                                }}>
                                    <span>Capacity</span>
                                    <span style={{ color: fillPct >= 80 ? '#f59e0b' : 'var(--accent-cyan)', fontWeight: 700 }}>
                                        {fillPct}% filled
                                    </span>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '99px', height: '6px' }}>
                                    <div style={{
                                        width: `${fillPct}%`,
                                        height: '100%',
                                        borderRadius: '99px',
                                        background: fillPct >= 80
                                            ? 'linear-gradient(90deg,#f59e0b,#ef4444)'
                                            : 'linear-gradient(90deg,#06b6d4,#6366f1)',
                                        transition: 'width 0.4s ease'
                                    }} />
                                </div>
                            </div>

                            {/* Revenue for this event */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: '14px',
                                paddingTop: '12px',
                                borderTop: '1px solid var(--border)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '0.9rem' }}>
                                    <TrendingUp size={14} />
                                    <span style={{ fontWeight: 700 }}>₹{(event.price * sold).toLocaleString('en-IN')}</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>revenue</span>
                                </div>
                                <button
                                    className="btn-danger-sm"
                                    onClick={() => onDelete(event.id)}
                                    title="Delete this event"
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
                                >
                                    <Trash2 size={14} />
                                    Delete Event
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
