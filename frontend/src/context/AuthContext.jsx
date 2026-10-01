import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuthState = async () => {
        const token = localStorage.getItem('nexus_jwt_token');
        if (!token) {
            setCurrentUser(null);
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setCurrentUser(data.user);
            } else {
                localStorage.removeItem('nexus_jwt_token');
                setCurrentUser(null);
            }
        } catch (err) {
            console.error('Auth verification error:', err);
            setCurrentUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuthState();
    }, []);

    // Login with Email
    const login = async (email, password) => {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                localStorage.setItem('nexus_jwt_token', data.token);
                setCurrentUser(data.user);
                return { success: true, user: data.user, message: data.message };
            }
            return {
                success: false,
                unverified: data.unverified || false,
                identifier: data.identifier,
                message: data.message || 'Login failed'
            };
        } catch {
            return { success: false, message: 'Server connection error during login.' };
        }
    };

    // Register with Email (triggers Email confirmation link)
    const register = async ({ fullName, email, password, role }) => {
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, email, password, role })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                return {
                    success: true,
                    requiresVerification: data.requiresVerification,
                    message: data.message,
                    recipient: data.recipient,
                    verificationLink: data.verificationLink,
                    user: data.user
                };
            }
            return { success: false, message: data.message || 'Registration failed' };
        } catch {
            return { success: false, message: 'Server connection error during registration.' };
        }
    };

    // Finalize registration by verifying confirmation token
    const verifyAccount = async (token) => {
        try {
            const res = await fetch(`/api/auth/verify?token=${encodeURIComponent(token)}`);
            const data = await res.json();
            if (res.ok && data.success) {
                if (data.token) {
                    localStorage.setItem('nexus_jwt_token', data.token);
                    setCurrentUser(data.user);
                }
                return { success: true, message: data.message, user: data.user };
            }
            return { success: false, message: data.message || 'Verification link is invalid or expired.' };
        } catch {
            return { success: false, message: 'Error verifying confirmation link.' };
        }
    };

    // Resend confirmation link via SMS or Email
    const resendVerification = async (identifier) => {
        try {
            const res = await fetch('/api/auth/resend-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier })
            });
            const data = await res.json();
            return data;
        } catch {
            return { success: false, message: 'Error connecting to resend service.' };
        }
    };

    const logout = () => {
        localStorage.removeItem('nexus_jwt_token');
        setCurrentUser(null);
    };

    const isOrganizer = currentUser && (currentUser.role === 'Organizer' || currentUser.role === 'Admin');

    return (
        <AuthContext.Provider value={{
            currentUser,
            loading,
            login,
            register,
            verifyAccount,
            resendVerification,
            logout,
            isOrganizer,
            checkAuthState
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
