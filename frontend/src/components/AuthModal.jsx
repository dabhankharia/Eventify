import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose, initialMode = 'login', showToast }) {
    const [mode, setMode] = useState(initialMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('Attendee');
    const [loading, setLoading] = useState(false);

    const { login, register } = useAuth();

    if (!isOpen) return null;

    const handleQuickFill = (demoEmail, demoPass) => {
        setEmail(demoEmail);
        setPassword(demoPass);
        setMode('login');
        showToast('Demo account credentials auto-filled', 'info');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (mode === 'login') {
                const res = await login(email, password);
                if (res.success) {
                    showToast(`Welcome back, ${res.user.fullName}!`, 'success');
                    onClose();
                } else {
                    showToast(res.message, 'error');
                }
            } else {
                const res = await register(fullName, email, password, role);
                if (res.success) {
                    showToast('Account registered successfully on Eventify!', 'success');
                    onClose();
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
            <div className="modal-card auth-modal-card" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>
                    <X size={18} />
                </button>

                <div className="auth-modal-header" style={{ marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                        {mode === 'login' ? 'Sign In to Eventify' : 'Create Eventify Account'}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                        {mode === 'login'
                            ? 'Access your digital ticket passes or manage your events'
                            : 'Register to book tickets and manage event passes'}
                    </p>
                </div>

                <div className="tab-switcher">
                    <button
                        className={`tab-btn ${mode === 'login' ? 'active' : ''}`}
                        onClick={() => setMode('login')}
                    >
                        Sign In
                    </button>
                    <button
                        className={`tab-btn ${mode === 'register' ? 'active' : ''}`}
                        onClick={() => setMode('register')}
                    >
                        Register Account
                    </button>
                </div>

                {/* 1-Click Demo Accounts */}
                <div className="demo-quick-row">
                    <button
                        type="button"
                        className="btn-demo-pill"
                        onClick={() => handleQuickFill('dhruvil@example.com', 'Password123!')}
                    >
                        <span>⚡ Demo Attendee</span> (Dhruvil Bhankharia)
                    </button>
                    <button
                        type="button"
                        className="btn-demo-pill organizer"
                        onClick={() => handleQuickFill('bhankharia.dhruvil@eventify.in', 'Password123!')}
                    >
                        <span>👑 Demo Organizer</span> (Bhankharia Dhruvil)
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
                            ? 'Authenticating...'
                            : mode === 'login'
                            ? 'Sign In & Continue'
                            : 'Create Account & Log In'}
                    </button>
                </form>
            </div>
        </div>
    );
}
