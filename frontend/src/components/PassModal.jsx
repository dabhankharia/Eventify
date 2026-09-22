import React from 'react';
import { X, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function PassModal({ isOpen, onClose, booking }) {
    if (!isOpen || !booking) return null;

    const qrPayload = JSON.stringify({
        app: 'Eventify',
        ticketCode: booking.ticketCode,
        attendee: booking.userName,
        event: booking.eventTitle,
        seats: booking.quantity,
        tier: booking.ticketTier,
        payment: booking.paymentMethod,
        verified: true
    });

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card pass-modal-card" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>
                    <X size={18} />
                </button>

                <div className="pass-header-gradient">
                    <span className="pass-badge">EVENTIFY CONFIRMED PASS</span>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '4px', lineHeight: 1.3 }}>
                        {booking.eventTitle}
                    </h2>
                </div>

                <div className="pass-body">
                    <div className="pass-info-grid">
                        <div className="pass-field">
                            <span className="field-lbl">PASS HOLDER</span>
                            <span className="field-val" style={{ color: 'var(--accent-cyan)' }}>
                                {booking.userName}
                            </span>
                        </div>
                        <div className="pass-field">
                            <span className="field-lbl">TICKET CODE</span>
                            <span className="field-val mono">{booking.ticketCode}</span>
                        </div>
                        <div className="pass-field">
                            <span className="field-lbl">DATE & SCHEDULE</span>
                            <span className="field-val">{booking.eventDate} • {booking.eventTime}</span>
                        </div>
                        <div className="pass-field">
                            <span className="field-lbl">VENUE / LOCATION</span>
                            <span className="field-val">{booking.eventLocation}</span>
                        </div>
                        <div className="pass-field">
                            <span className="field-lbl">TIER & SEATS</span>
                            <span className="field-val">{booking.ticketTier} (x{booking.quantity})</span>
                        </div>
                        <div className="pass-field">
                            <span className="field-lbl">TOTAL PAID</span>
                            <span className="field-val" style={{ color: 'var(--accent-emerald)' }}>
                                ₹{Number(booking.totalPrice).toLocaleString('en-IN')}
                            </span>
                        </div>
                    </div>

                    <div className="qr-container">
                        <div className="qr-box">
                            <QRCodeSVG
                                value={qrPayload}
                                size={140}
                                level="H"
                                fgColor="#080a0f"
                                bgColor="#ffffff"
                            />
                        </div>
                        <span className="qr-sub">Scan at Venue Check-in Gate</span>
                    </div>

                    <div className="pass-footer">
                        <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => window.print()}>
                            <Printer size={16} />
                            Print / Save PDF
                        </button>
                        <button type="button" className="btn-primary" style={{ flex: 1 }} onClick={onClose}>
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
