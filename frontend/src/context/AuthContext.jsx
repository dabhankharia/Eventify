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

    const login = async (email, password) => {
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
        return { success: false, message: data.message || 'Login failed' };
    };

    const register = async (fullName, email, password, role) => {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, email, password, role })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            localStorage.setItem('nexus_jwt_token', data.token);
            setCurrentUser(data.user);
            return { success: true, user: data.user, message: data.message };
        }
        return { success: false, message: data.message || 'Registration failed' };
    };

    const logout = () => {
        localStorage.removeItem('nexus_jwt_token');
        setCurrentUser(null);
    };

    const isOrganizer = currentUser && (currentUser.role === 'Organizer' || currentUser.role === 'Admin');

    return (
        <AuthContext.Provider value={{ currentUser, loading, login, register, logout, isOrganizer, checkAuthState }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
