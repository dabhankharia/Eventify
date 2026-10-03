import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import EventsGrid from './components/EventsGrid';
import BookingsView from './components/BookingsView';
import HostedEventsView from './components/HostedEventsView';
import OrganizerStudio from './components/OrganizerStudio';
import AuthModal from './components/AuthModal';
import BookingModal from './components/BookingModal';
import RazorpayModal from './components/RazorpayModal';
import PassModal from './components/PassModal';
import ToastContainer from './components/Toast';
import { launchRazorpayPayment } from './utils/razorpay';

function MainApp() {
    const { currentUser, verifyAccount, logout, isOrganizer } = useAuth();

    // App state
    const [activeTab, setActiveTab] = useState('explore');
    const [events, setEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    const [bookings, setBookings] = useState([]);
    const [hostedEvents, setHostedEvents] = useState([]);
    const [toasts, setToasts] = useState([]);

    // Modal state
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalMode, setAuthModalMode] = useState('login');

    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [selectedBookingEvent, setSelectedBookingEvent] = useState(null);

    const [isRazorpayModalOpen, setIsRazorpayModalOpen] = useState(false);
    const [checkoutData, setCheckoutData] = useState(null);

    const [isPassModalOpen, setIsPassModalOpen] = useState(false);
    const [activePass, setActivePass] = useState(null);

    const showToast = (message, type = 'info') => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3500);
    };

    // Auto-detect confirmation link query parameters in URL (?verify_token=...)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('verify_token');
        const verifiedFlag = params.get('verified');
        const name = params.get('name');

        if (token) {
            verifyAccount(token).then((res) => {
                if (res.success) {
                    showToast(`🎉 Registration finalized! Welcome${res.user?.fullName ? ', ' + res.user.fullName : ''}!`, 'success');
                } else {
                    showToast(res.message, 'error');
                }
                // Clean URL parameters cleanly
                window.history.replaceState({}, document.title, window.location.pathname);
            });
        } else if (verifiedFlag === 'success') {
            showToast(`🎉 Registration confirmed successfully! Welcome to Eventify${name ? ', ' + decodeURIComponent(name) : ''}!`, 'success');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [verifyAccount]);

    // Load events from API (with search and category)
    const fetchEvents = useCallback(async () => {
        try {
            setLoadingEvents(true);
            let url = `/api/events?category=${encodeURIComponent(selectedCategory)}`;
            if (searchQuery.trim()) {
                url += `&search=${encodeURIComponent(searchQuery.trim())}`;
            }

            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                setEvents(data.events);
            }
        } catch {
            console.error('Fetch events error');
        } finally {
            setLoadingEvents(false);
        }
    }, [selectedCategory, searchQuery]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    // Load user bookings
    const fetchMyBookings = useCallback(async () => {
        const token = localStorage.getItem('nexus_jwt_token');
        if (!token || !currentUser) {
            setBookings([]);
            return;
        }

        try {
            const res = await fetch('/api/bookings/my', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setBookings(data.bookings);
            }
        } catch {
            console.error('Fetch bookings error');
        }
    }, [currentUser]);

    // Load organizer's own hosted events
    const fetchMyHostedEvents = useCallback(async () => {
        const token = localStorage.getItem('nexus_jwt_token');
        if (!token || !currentUser || !isOrganizer) {
            setHostedEvents([]);
            return;
        }
        try {
            const res = await fetch('/api/events/my', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setHostedEvents(data.events);
        } catch {
            console.error('Fetch hosted events error');
        }
    }, [currentUser, isOrganizer]);

    useEffect(() => {
        fetchMyBookings();
        fetchMyHostedEvents();
    }, [fetchMyBookings, fetchMyHostedEvents]);

    // Handle Open Auth Modal
    const handleOpenAuth = (mode = 'login') => {
        setAuthModalMode(mode);
        setIsAuthModalOpen(true);
    };

    // Handle Delete Account
    const handleDeleteAccount = async () => {
        const confirmed = confirm(
            '⚠️ Delete your account permanently?\n\n' +
            'This will:\n' +
            '• Permanently delete your account\n' +
            '• Invalidate ALL tickets and bookings purchased from this account\n' +
            '• This action CANNOT be undone.\n\n' +
            'Are you absolutely sure?'
        );
        if (!confirmed) return;

        const token = localStorage.getItem('nexus_jwt_token');
        try {
            const res = await fetch('/api/auth/me', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast('Account permanently deleted. We\u2019re sorry to see you go.', 'info');
                logout();
                setActiveTab('explore');
                setBookings([]);
                setHostedEvents([]);
            } else {
                showToast(data.message || 'Failed to delete account.', 'error');
            }
        } catch {
            showToast('Error connecting to server.', 'error');
        }
    };

    // Handle Book Ticket Click
    const handleStartBooking = (event) => {
        setSelectedBookingEvent(event);
        setIsBookingModalOpen(true);
    };

    // Handle Free Presentation Demo Checkout
    const handleFreeDemoBook = async (data) => {
        const token = localStorage.getItem('nexus_jwt_token');
        try {
            const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    eventId: data.event.id,
                    ticketTier: data.ticketTier,
                    quantity: data.quantity,
                    paymentMethod: 'Free Presentation Demo'
                })
            });

            const resData = await res.json();
            if (res.ok && resData.success) {
                setIsBookingModalOpen(false);
                showToast('Ticket Reserved Successfully via Demo Mode!', 'success');
                setActivePass(resData.booking);
                setIsPassModalOpen(true);
                fetchEvents();
                fetchMyBookings();
            } else {
                showToast(resData.message || 'Booking failed', 'error');
            }
        } catch {
            showToast('Error completing demo booking.', 'error');
        }
    };

    // Handle Open Razorpay Checkout (Real SDK with fallback simulator)
    const handleProceedToRazorpay = async (data) => {
        setIsBookingModalOpen(false);
        const token = localStorage.getItem('nexus_jwt_token');

        try {
            showToast('Initiating Razorpay payment order...', 'info');
            const orderRes = await fetch('/api/bookings/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    eventId: data.event.id,
                    ticketTier: data.ticketTier,
                    quantity: data.quantity
                })
            });

            const orderData = await orderRes.json();
            if (!orderRes.ok || !orderData.success) {
                showToast(orderData.message || 'Could not initiate Razorpay order.', 'error');
                return;
            }

            if (orderData.isLiveSdk) {
                // Real Razorpay SDK popup
                launchRazorpayPayment({
                    orderData,
                    user: currentUser,
                    onSuccess: async (rzpResponse) => {
                        showToast('Verifying payment signature...', 'info');
                        try {
                            const verifyRes = await fetch('/api/bookings/verify-payment', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                    eventId: data.event.id,
                                    ticketTier: data.ticketTier,
                                    quantity: data.quantity,
                                    razorpay_order_id: rzpResponse.razorpay_order_id,
                                    razorpay_payment_id: rzpResponse.razorpay_payment_id,
                                    razorpay_signature: rzpResponse.razorpay_signature,
                                    paymentMethod: 'Razorpay Gateway (Test Mode)'
                                })
                            });

                            const verifyData = await verifyRes.json();
                            if (verifyRes.ok && verifyData.success) {
                                showToast('🎉 Razorpay Payment Verified! Digital Pass Generated.', 'success');
                                setActivePass(verifyData.booking);
                                setIsPassModalOpen(true);
                                fetchEvents();
                                fetchMyBookings();
                            } else {
                                showToast(verifyData.message || 'Signature verification failed.', 'error');
                            }
                        } catch {
                            showToast('Error verifying payment on server.', 'error');
                        }
                    },
                    onFailure: (errMsg) => {
                        showToast(errMsg, 'error');
                    }
                });
            } else {
                // Fallback simulation modal when Razorpay keys are not yet configured in .env
                setCheckoutData(data);
                setIsRazorpayModalOpen(true);
            }
        } catch (err) {
            console.error('Razorpay initialization error:', err);
            showToast('Error connecting to Razorpay service.', 'error');
        }
    };

    // Handle Complete Razorpay Simulated Checkout (Fallback mode)
    const handleCompleteRazorpay = async (paymentMethodLabel, paymentId) => {
        const token = localStorage.getItem('nexus_jwt_token');
        try {
            const res = await fetch('/api/bookings/verify-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    eventId: checkoutData.event.id,
                    ticketTier: checkoutData.ticketTier,
                    quantity: checkoutData.quantity,
                    razorpay_payment_id: paymentId,
                    paymentMethod: paymentMethodLabel
                })
            });

            const resData = await res.json();
            if (res.ok && resData.success) {
                setIsRazorpayModalOpen(false);
                showToast(`Payment Verified via ${paymentMethodLabel}!`, 'success');
                setActivePass(resData.booking);
                setIsPassModalOpen(true);
                fetchEvents();
                fetchMyBookings();
            } else {
                showToast(resData.message || 'Payment processing failed', 'error');
            }
        } catch {
            showToast('Error recording booking transaction.', 'error');
        }
    };

    // Handle Cancel Booking
    const handleCancelBooking = async (bookingId) => {
        if (!confirm('Are you sure you want to cancel this booking pass?')) return;

        const token = localStorage.getItem('nexus_jwt_token');
        try {
            const res = await fetch(`/api/bookings/${bookingId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast('Booking cancelled and seats successfully restored.', 'info');
                fetchMyBookings();
                fetchEvents();
            } else {
                showToast(data.message || 'Failed to cancel booking', 'error');
            }
        } catch {
            showToast('Error cancelling booking.', 'error');
        }
    };

    // Handle Delete Event (Organizer Only — from Hosted Events tab)
    const handleDeleteEvent = async (eventId) => {
        if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;

        const token = localStorage.getItem('nexus_jwt_token');
        try {
            const res = await fetch(`/api/events/${eventId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast('Event deleted successfully.', 'info');
                fetchEvents();
                fetchMyHostedEvents();
            } else {
                showToast(data.message || 'Failed to delete event', 'error');
            }
        } catch {
            showToast('Error deleting event.', 'error');
        }
    };

    return (
        <div className="app-shell">
            <Navbar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                bookingsCount={bookings.length}
                openAuthModal={handleOpenAuth}
                onDeleteAccount={handleDeleteAccount}
            />

            <main>
                {activeTab === 'explore' && (
                    <>
                        <Hero
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            selectedCategory={selectedCategory}
                            setSelectedCategory={setSelectedCategory}
                        />
                        <EventsGrid
                            events={events}
                            loading={loadingEvents}
                            onBook={handleStartBooking}
                        />
                    </>
                )}

                {activeTab === 'bookings' && (
                    <BookingsView
                        bookings={bookings}
                        onViewPass={(b) => {
                            setActivePass(b);
                            setIsPassModalOpen(true);
                        }}
                        onCancelBooking={handleCancelBooking}
                        setActiveTab={setActiveTab}
                    />
                )}

                {activeTab === 'hosted' && (
                    <HostedEventsView
                        events={hostedEvents}
                        onDelete={handleDeleteEvent}
                        onGoCreateEvent={() => setActiveTab('organizer')}
                    />
                )}

                {activeTab === 'organizer' && (
                    <OrganizerStudio
                        events={events}
                        onEventCreated={() => {
                            fetchEvents();
                            fetchMyHostedEvents();
                            setActiveTab('hosted');
                        }}
                        openAuthModal={handleOpenAuth}
                        showToast={showToast}
                    />
                )}
            </main>

            {/* Modals */}
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                initialMode={authModalMode}
                showToast={showToast}
            />

            <BookingModal
                isOpen={isBookingModalOpen}
                onClose={() => setIsBookingModalOpen(false)}
                event={selectedBookingEvent}
                onProceedToRazorpay={handleProceedToRazorpay}
                onFreeDemoBook={handleFreeDemoBook}
                openAuthModal={handleOpenAuth}
                showToast={showToast}
            />

            <RazorpayModal
                isOpen={isRazorpayModalOpen}
                onClose={() => setIsRazorpayModalOpen(false)}
                checkoutData={checkoutData}
                onCompletePayment={handleCompleteRazorpay}
            />

            <PassModal
                isOpen={isPassModalOpen}
                onClose={() => setIsPassModalOpen(false)}
                booking={activePass}
            />

            <ToastContainer toasts={toasts} />
        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <MainApp />
        </AuthProvider>
    );
}
