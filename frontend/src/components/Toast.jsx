import React from 'react';

export default function ToastContainer({ toasts }) {
    if (toasts.length === 0) return null;

    return (
        <div className="toast-container">
            {toasts.map((t) => (
                <div key={t.id} className={`toast ${t.type || 'info'}`}>
                    {t.message}
                </div>
            ))}
        </div>
    );
}
