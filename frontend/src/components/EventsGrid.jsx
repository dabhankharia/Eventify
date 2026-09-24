import React from 'react';
import EventCard from './EventCard';

export default function EventsGrid({ events, loading, onBook, onDelete }) {
    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <p>Loading upcoming events...</p>
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '8px', color: '#fff' }}>No events found</h3>
                <p>Try selecting a different category or clearing your search keywords.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="section-header">
                <div>
                    <h2>Upcoming Events in India</h2>
                    <p className="section-desc">Hand-picked developer summits, festivals, and business conclaves.</p>
                </div>
                <span className="events-counter">{events.length} events available</span>
            </div>

            <div className="events-grid">
                {events.map((evt) => (
                    <EventCard
                        key={evt.id}
                        event={evt}
                        onBook={onBook}
                        onDelete={onDelete}
                    />
                ))}
            </div>
        </div>
    );
}
