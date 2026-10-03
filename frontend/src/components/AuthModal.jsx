import React, { useState } from 'react';
import { X, Mail, CheckCircle, ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose, initialMode = 'login', showToast }) {
    const [mode, setMode] = useState(initialMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('Attendee');
    const [loading, setLoading] = useState(false);

    // States for verification flow
    const [pendingVerification, setPendingVerification] = useState(null); // { recipient }
    const [unverifiedAlert, setUnverifiedAlert] = useState(null); // { identifier }
    const [resending, setResending] = useState(false);

    const { login, register, resendVerification } = useAuth();

    if (!isOpen) return null;

    const handleQuickFill = (val, pass) => {
        setEmail(val);
        setPassword(pass);
        setMode('login');
        setUnverifiedAlert(null);
        showToast('Demo account credentials auto-filled', 'info');
    };

    const handleResend = async (identifier) => {
        setResending(true);
        try {
            const res = await resendVerification(identifier);
            if (res.success) {
                showToast(res.message, 'success');
            } else {
                showToast(res.message, 'error');
            }
        } catch {
            showToast('Failed to resend confirmation link', 'error');
        } finally {
            setResending(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setUnverifiedAlert(null);

        try {
            if (mode === 'login') {
                const res = await login(email, password);
                if (res.success) {
                    showToast(`Welcome back, ${res.user.fullName}!`, 'success');
                    onClose();
                } else if (res.unverified) {
                    setUnverifiedAlert({
                        identifier: res.identifier || email,
                        message: res.message
                    });
                    showToast('Account confirmation required before login', 'error');
                } else {
                    showToast(res.message, 'error');
                }
            } else {
                // Register
                const res = await register({
                    fullName,
                    email,
                    password,
                    role
                });

                if (res.success) {
                    if (res.requiresVerification) {
                        setPendingVerification({
                            recipient: res.recipient || email,
                            message: res.message
                        });
                        showToast('Confirmation link sent to your email', 'success');
                    } else {
                        showToast('Account registered successfully on Eventify!', 'success');
                        onClose();
                    }
                } else {
                    showToast(res.message, 'error');
                }
            }
        } catch {
            showToast('Authentication connection error.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card auth-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                <button className="modal-close" onClick={onClose}>
                    <X size={18} />
                </button>

                {/* 1. REGISTRATION PENDING EMAIL VERIFICATION STATE */}
                {pendingVerification ? (
                    <div style={{ textAlign: 'center', padding: '12px 6px' }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: 'rgba(99, 102, 241, 0.15)',
                            color: '#818cf8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 18px auto'
                        }}>
                            <Mail size={32} />
                        </div>

                        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, marginBottom: '8px' }}>
                            Email Confirmation Sent!
                        </h2>

                        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '20px' }}>
                            We sent a secure confirmation link to <br/>
                            <strong style={{ color: 'var(--text-main, #f8fafc)', fontSize: '1rem' }}>
                                {pendingVerification.recipient}
                            </strong>
                        </p>

                        <div style={{
                            background: 'var(--bg-card, #182234)',
                            border: '1px solid var(--border-color, #27354f)',
                            borderRadius: '12px',
                            padding: '16px',
                            textAlign: 'left',
                            marginBottom: '20px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: 700, fontSize: '0.88rem', marginBottom: '6px' }}>
                                <AlertTriangle size={16} /> Finalize Your Registration
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                                Please click the confirmation link sent to your email inbox to activate your account and start booking passes or organizing events.
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => handleResend(pendingVerification.recipient)}
                                disabled={resending}
                                style={{ fontSize: '0.85rem' }}
                            >
                                <RefreshCw size={14} className={resending ? 'spin' : ''} /> Resend Link
                            </button>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => {
                                    setPendingVerification(null);
                                    setMode('login');
                                }}
                                style={{ fontSize: '0.85rem' }}
                            >
                                Go to Sign In
                            </button>
                        </div>
                    </div>
                ) : (
                    /* 2. STANDARD SIGN IN / REGISTER FORM */
                    <>
                        <div className="auth-modal-header" style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                                {mode === 'login' ? 'Sign In to Eventify' : 'Create Eventify Account'}
                            </h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                                {mode === 'login'
                                    ? 'Access your digital ticket passes or manage your events'
                                    : 'Register with your email to receive pass confirmations'}
                            </p>
                        </div>

                        {/* Sign In vs Register Switcher */}
                        <div className="tab-switcher">
                            <button
                                className={`tab-btn ${mode === 'login' ? 'active' : ''}`}
                                onClick={() => {
                                    setMode('login');
                                    setUnverifiedAlert(null);
                                }}
                            >
                                Sign In
                            </button>
                            <button
                                className={`tab-btn ${mode === 'register' ? 'active' : ''}`}
                                onClick={() => {
                                    setMode('register');
                                    setUnverifiedAlert(null);
                                }}
                            >
                                Register Account
                            </button>
                        </div>

                        {/* UNVERIFIED LOGIN BLOCK ALERT */}
                        {unverifiedAlert && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '10px',
                                padding: '14px',
                                marginBottom: '16px',
                                fontSize: '0.88rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 700, marginBottom: '4px' }}>
                                    <AlertTriangle size={16} /> Confirmation Required
                                </div>
                                <p style={{ color: 'var(--text-main, #f8fafc)', margin: '4px 0 10px 0', fontSize: '0.85rem', lineHeight: 1.4 }}>
                                    {unverifiedAlert.message}
                                </p>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={() => handleResend(unverifiedAlert.identifier)}
                                        disabled={resending}
                                        className="btn-demo-pill"
                                        style={{ fontSize: '0.8rem', padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none' }}
                                    >
                                        <RefreshCw size={12} className={resending ? 'spin' : ''} /> Resend Confirmation Link
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 1-Click Demo Accounts */}
                        <div className="demo-quick-row">
                            <button
                                type="button"
                                className="btn-demo-pill"
                                onClick={() => handleQuickFill('dhruvil@example.com', 'Password123!')}
                            >
                                <span>⚡ Demo Attendee</span>
                            </button>
                            <button
                                type="button"
                                className="btn-demo-pill organizer"
                                onClick={() => handleQuickFill('bhankharia.dhruvil@eventify.in', 'Password123!')}
                            >
                                <span>👑 Demo Organizer</span>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {mode === 'register' && (
                                <>
                                    <div className="form-group">
                                        <label>Full Name</label>
                                        <input
                                            type="text"
                                            placeholder="Dhruvil Bhankharia"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Account Role</label>
                                        <select value={role} onChange={(e) => setRole(e.target.value)}>
                                            <option value="Attendee">Attendee (Browse & Book Tickets)</option>
                                            <option value="Organizer">Event Organizer (Publish & Manage Events)</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            <div className="form-group">
                                <label>Email Address</label>
                                <input
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                                {mode === 'register' && (
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                                        ✉️ A confirmation link will be sent to your email to activate your account.
                                    </span>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Password</label>
                                <input
                                    type="password"
                                    placeholder="••••••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '12px' }}>
                                {loading
                                    ? 'Processing...'
                                    : mode === 'login'
                                    ? 'Sign In & Continue'
                                    : 'Register & Send Confirmation Link'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
