import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import EventsGrid from './components/EventsGrid';
import BookingsView from './components/BookingsView';
import OrganizerStudio from './components/OrganizerStudio';
import AuthModal from './components/AuthModal';
import BookingModal from './components/BookingModal';
import RazorpayModal from './components/RazorpayModal';
import PassModal from './components/PassModal';
import ToastContainer from './components/Toast';

function MainApp() {
    const { currentUser, isOrganizer } = useAuth();

    // App state
    const [activeTab, setActiveTab] = useState('explore');
    const [events, setEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    const [bookings, setBookings] = useState([]);
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

    // Load events from API (with search and category)
    const fetchEvents = async () => {
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
        } catch (err) {
            console.error('Fetch events error:', err);
        } finally {
            setLoadingEvents(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, [selectedCategory, searchQuery]);

    // Load user bookings
    const fetchMyBookings = async () => {
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
        } catch (err) {
            console.error('Fetch bookings error:', err);
        }
    };

    useEffect(() => {
        fetchMyBookings();
    }, [currentUser]);

    // Handle Open Auth Modal
    const handleOpenAuth = (mode = 'login') => {
        setAuthModalMode(mode);
        setIsAuthModalOpen(true);
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
        } catch (err) {
            showToast('Error completing demo booking.', 'error');
        }
    };

    // Handle Open Razorpay Modal
    const handleProceedToRazorpay = (data) => {
        setIsBookingModalOpen(false);
        setCheckoutData(data);
        setIsRazorpayModalOpen(true);
    };

    // Handle Complete Razorpay Simulated Checkout
    const handleCompleteRazorpay = async (paymentMethodLabel, paymentId) => {
        const token = localStorage.getItem('nexus_jwt_token');
        try {
            const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    eventId: checkoutData.event.id,
                    ticketTier: checkoutData.ticketTier,
                    quantity: checkoutData.quantity,
                    paymentMethod: paymentMethodLabel,
                    paymentId
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
        } catch (err) {
            showToast('Error recording booking transaction.', 'error');
        }
    };

    // Handle Cancel Booking
    const handleCancelBooking = async (bookingId) => {
        if (!confirm('Are you sure you want to cancel this booking pass? Seat quota will be restored.')) return;

        const token = localStorage.getItem('nexus_jwt_token');
        try {
            const res = await fetch(`/api/bookings/${bookingId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast('Booking cancelled and seats restored to PostgreSQL.', 'info');
                fetchMyBookings();
                fetchEvents();
            } else {
                showToast(data.message || 'Failed to cancel booking', 'error');
            }
        } catch (err) {
            showToast('Error cancelling booking.', 'error');
        }
    };

    // Handle Delete Event (Organizer Only)
    const handleDeleteEvent = async (eventId) => {
        if (!confirm('Are you sure you want to delete this event from PostgreSQL?')) return;

        const token = localStorage.getItem('nexus_jwt_token');
        try {
            const res = await fetch(`/api/events/${eventId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast('Event deleted from PostgreSQL.', 'info');
                fetchEvents();
            } else {
                showToast(data.message || 'Failed to delete event', 'error');
            }
        } catch (err) {
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
                            onDelete={handleDeleteEvent}
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

                {activeTab === 'organizer' && (
                    <OrganizerStudio
                        events={events}
                        onEventCreated={(newEvent) => {
                            fetchEvents();
                            setActiveTab('explore');
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
