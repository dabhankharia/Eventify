import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function BookingModal({
    isOpen,
    onClose,
    event,
    onProceedToRazorpay,
    onFreeDemoBook,
    openAuthModal,
    showToast
}) {
    const [selectedTier, setSelectedTier] = useState('General Admission');
    const [quantity, setQuantity] = useState(1);
    const { currentUser } = useAuth();

    if (!isOpen || !event) return null;

    // Multipliers
    let multiplier = 1.0;
    if (selectedTier === 'VIP Pass') multiplier = 1.6;
    if (selectedTier === 'Early Bird') multiplier = 0.85;

    const unitPrice = Math.round(Number(event.price) * multiplier);
    const totalAmount = unitPrice * quantity;

    const handleAdjustQty = (delta) => {
        const next = quantity + delta;
        if (next < 1) return;
        if (next > event.availableSeats) {
            showToast(`Maximum ${event.availableSeats} seats available for this event`, 'info');
            return;
        }
        setQuantity(next);
    };

    const handleCheckoutCheck = (action) => {
        if (!currentUser) {
            onClose();
            openAuthModal('login');
            showToast('Please sign in to book your ticket pass.', 'info');
            return;
        }
        action({
            event,
            ticketTier: selectedTier,
            quantity,
            unitPrice,
            totalAmount
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card booking-modal-card" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>
                    <X size={18} />
                </button>

                <div
                    className="modal-event-banner"
                    style={{ background: event.bannerGradient || 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)' }}
                >
                    <span className="badge-tag" style={{ display: 'inline-block', marginBottom: '8px' }}>
                        {event.badge || event.category}
                    </span>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.3 }}>{event.title}</h2>
                </div>

                <div className="modal-body-content">
                    <div className="evt-card-details" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                        <div className="evt-detail-row">
                            <Calendar size={15} color="var(--text-subtle)" />
                            <span>{event.date}</span>
                        </div>
                        <div className="evt-detail-row">
                            <Clock size={15} color="var(--text-subtle)" />
                            <span>{event.time}</span>
                        </div>
                        <div className="evt-detail-row">
                            <MapPin size={15} color="var(--text-subtle)" />
                            <span>{event.location}</span>
                        </div>
                    </div>

                    <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '20px' }}>
                        {event.description}
                    </p>

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px' }}>
                        Select Ticket Pass Tier
                    </h3>

                    <div className="tier-options">
                        <div
                            className={`tier-card ${selectedTier === 'General Admission' ? 'active' : ''}`}
                            onClick={() => setSelectedTier('General Admission')}
                        >
                            <div className="tier-info">
                                <span className="tier-name">General Admission</span>
                                <span className="tier-sub">Full day mainstage access + recordings</span>
                            </div>
                            <span className="tier-price">₹{Number(event.price).toLocaleString('en-IN')}</span>
                        </div>

                        <div
                            className={`tier-card ${selectedTier === 'VIP Pass' ? 'active' : ''}`}
                            onClick={() => setSelectedTier('VIP Pass')}
                        >
                            <div className="tier-info">
                                <span className="tier-name">VIP All-Access Pass</span>
                                <span className="tier-sub">Priority front seats, VIP lounge & networking dinner</span>
                            </div>
                            <span className="tier-price">₹{Math.round(event.price * 1.6).toLocaleString('en-IN')}</span>
                        </div>

                        <div
                            className={`tier-card ${selectedTier === 'Early Bird' ? 'active' : ''}`}
                            onClick={() => setSelectedTier('Early Bird')}
                        >
                            <div className="tier-info">
                                <span className="tier-name">Early Bird Discount</span>
                                <span className="tier-sub">15% off standard admission price</span>
                            </div>
                            <span className="tier-price">₹{Math.round(event.price * 0.85).toLocaleString('en-IN')}</span>
                        </div>
                    </div>

                    <div className="quantity-selector-row">
                        <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>Ticket Quantity:</span>
                        <div className="qty-stepper">
                            <button type="button" className="btn-qty" onClick={() => handleAdjustQty(-1)}>-</button>
                            <span className="qty-val">{quantity}</span>
                            <button type="button" className="btn-qty" onClick={() => handleAdjustQty(1)}>+</button>
                        </div>
                    </div>

                    <div className="checkout-footer">
                        <div className="total-price-box">
                            <span className="total-label">Total Amount</span>
                            <span className="total-amount">₹{totalAmount.toLocaleString('en-IN')}</span>
                        </div>

                        <div className="checkout-buttons-row">
                            <button
                                type="button"
                                className="btn-razorpay"
                                onClick={() => handleCheckoutCheck(onProceedToRazorpay)}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                                Pay with Razorpay (₹)
                            </button>

                            <button
                                type="button"
                                className="btn-demo-free"
                                onClick={() => handleCheckoutCheck(onFreeDemoBook)}
                            >
                                <Zap size={16} />
                                Free Pass (Demo Mode)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
