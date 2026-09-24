import React from 'react';
import { Calendar, MapPin, Users, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function EventCard({ event, onBook, onDelete }) {
    const { isOrganizer } = useAuth();

    return (
        <div className="event-card">
            <div
                className="event-card-banner"
                style={{ background: event.bannerGradient || 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)' }}
            >
                <span className="badge-cat">{event.category}</span>
                <span className="badge-tag">{event.badge || 'Upcoming'}</span>
            </div>

            <div className="event-card-body">
                <h3 className="evt-card-title">{event.title}</h3>

                <div className="evt-card-details">
                    <div className="evt-detail-row">
                        <Calendar size={15} color="var(--text-subtle)" />
                        <span>{event.date} • {event.time}</span>
                    </div>
                    <div className="evt-detail-row">
                        <MapPin size={15} color="var(--text-subtle)" />
                        <span>{event.location}</span>
                    </div>
                    <div className="evt-detail-row" style={{ color: 'var(--accent-cyan)' }}>
                        <Users size={15} />
                        <span>{event.availableSeats} of {event.totalSeats} seats remaining</span>
                    </div>
                </div>

                <div className="evt-card-footer">
                    <div className="evt-price-box">
                        <span className="evt-price-lbl">Pass Price</span>
                        <span className="evt-price-val">₹{Number(event.price).toLocaleString('en-IN')}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {isOrganizer && (
                            <button
                                className="btn-delete-evt"
                                onClick={() => onDelete(event.id)}
                                title="Delete event"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                        <button
                            className="btn-book-now"
                            onClick={() => onBook(event)}
                            disabled={event.availableSeats <= 0}
                        >
                            {event.availableSeats > 0 ? 'Book Ticket' : 'Sold Out'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
