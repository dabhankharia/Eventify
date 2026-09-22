import React, { useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';

export default function RazorpayModal({ isOpen, onClose, checkoutData, onCompletePayment }) {
    const [activeTab, setActiveTab] = useState('upi');
    const [vpa, setVpa] = useState('');

    if (!isOpen || !checkoutData) return null;

    const handlePay = (methodName) => {
        const payId = 'pay_rzp_' + Math.floor(100000 + Math.random() * 900000);
        onCompletePayment(`Razorpay Gateway (${methodName})`, payId);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card rzp-modal-card" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>
                    <X size={18} />
                </button>

                <div className="rzp-header">
                    <div className="rzp-brand-info">
                        <div className="rzp-logo-badge">R</div>
                        <div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Eventify Passes</h3>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {checkoutData.ticketTier} x {checkoutData.quantity} for {checkoutData.event?.title}
                            </p>
                        </div>
                    </div>

                    <div className="rzp-amount-badge">
                        <span className="rzp-lbl">AMOUNT TO PAY</span>
                        <span className="rzp-val">₹{checkoutData.totalAmount.toLocaleString('en-IN')}</span>
                    </div>
                </div>

                <div className="rzp-body">
                    <div className="rzp-nav-tabs">
                        <button
                            className={`rzp-tab ${activeTab === 'upi' ? 'active' : ''}`}
                            onClick={() => setActiveTab('upi')}
                        >
                            UPI / QR
                        </button>
                        <button
                            className={`rzp-tab ${activeTab === 'card' ? 'active' : ''}`}
                            onClick={() => setActiveTab('card')}
                        >
                            Cards
                        </button>
                        <button
                            className={`rzp-tab ${activeTab === 'nb' ? 'active' : ''}`}
                            onClick={() => setActiveTab('nb')}
                        >
                            Netbanking
                        </button>
                    </div>

                    {activeTab === 'upi' && (
                        <div>
                            <div className="upi-apps-grid">
                                <div className="upi-app-chip" onClick={() => handlePay('GPay UPI')}>
                                    <span className="chip-icon green">G</span> GPay
                                </div>
                                <div className="upi-app-chip" onClick={() => handlePay('PhonePe UPI')}>
                                    <span className="chip-icon purple">P</span> PhonePe
                                </div>
                                <div className="upi-app-chip" onClick={() => handlePay('Paytm UPI')}>
                                    <span className="chip-icon blue">P</span> Paytm
                                </div>
                                <div className="upi-app-chip" onClick={() => handlePay('BHIM UPI')}>
                                    <span className="chip-icon orange">B</span> BHIM
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                <input
                                    type="text"
                                    placeholder="yourname@upi (e.g. 9876543210@paytm)"
                                    value={vpa}
                                    onChange={(e) => setVpa(e.target.value)}
                                    style={{
                                        flex: 1,
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        padding: '10px 14px',
                                        color: '#fff',
                                        fontSize: '0.9rem',
                                        outline: 'none'
                                    }}
                                />
                                <button
                                    type="button"
                                    className="btn-rzp-pay"
                                    style={{ width: 'auto', padding: '10px 18px' }}
                                    onClick={() => handlePay(vpa || 'VPA UPI')}
                                >
                                    Pay Now
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'card' && (
                        <div>
                            <div className="form-group">
                                <label>Card Number</label>
                                <input type="text" defaultValue="4111 2222 3333 4444" />
                            </div>
                            <div className="form-grid-2">
                                <div className="form-group">
                                    <label>Expiry Date</label>
                                    <input type="text" defaultValue="12 / 28" />
                                </div>
                                <div className="form-group">
                                    <label>CVV</label>
                                    <input type="password" defaultValue="123" />
                                </div>
                            </div>
                            <button
                                type="button"
                                className="btn-rzp-pay"
                                onClick={() => handlePay('Credit/Debit Card')}
                            >
                                Authorize & Pay ₹{checkoutData.totalAmount.toLocaleString('en-IN')}
                            </button>
                        </div>
                    )}

                    {activeTab === 'nb' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank'].map((bank) => (
                                <button
                                    key={bank}
                                    type="button"
                                    className="upi-app-chip"
                                    style={{ justifyContent: 'center' }}
                                    onClick={() => handlePay(bank)}
                                >
                                    {bank}
                                </button>
                            ))}
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '20px', color: 'var(--text-subtle)', fontSize: '0.78rem' }}>
                        <ShieldCheck size={14} color="#3395ff" />
                        <span>Secured by Razorpay Payment Gateway Simulation</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
