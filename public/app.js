// Eventify Application Logic

const API_BASE = '/api';
let currentUser = null;
let allEvents = [];
let myBookings = [];
let selectedCategory = 'All';
let currentBookingEvent = null;
let currentCheckoutQty = 1;

document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    loadEvents();
});

// Check JWT Authentication State
async function checkAuthState() {
    const token = localStorage.getItem('nexus_jwt_token');

    if (!token) {
        renderAuthNavbar(null);
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (response.ok && data.success) {
            currentUser = data.user;
            renderAuthNavbar(currentUser);
            loadMyBookings();
        } else {
            localStorage.removeItem('nexus_jwt_token');
            currentUser = null;
            renderAuthNavbar(null);
        }
    } catch (err) {
        console.error('Auth Check Error:', err);
        renderAuthNavbar(null);
    }
}

// Render Navbar Auth Section & Check Role Permissions
function renderAuthNavbar(user) {
    const btnOpenAuth = document.getElementById('btn-open-auth');
    const userPill = document.getElementById('user-profile-pill');
    const createFormCard = document.getElementById('create-event-card-box');
    const restrictionBanner = document.getElementById('organizer-restriction-banner');

    if (user) {
        btnOpenAuth.classList.add('hidden');
        userPill.classList.remove('hidden');

        document.getElementById('nav-user-name').textContent = user.fullName;
        document.getElementById('nav-user-role').textContent = user.role;
        
        const initials = user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        document.getElementById('nav-avatar').textContent = initials || 'US';

        // Role-Based Organizer Studio Access Control
        if (user.role === 'Organizer' || user.role === 'Admin') {
            if (createFormCard) createFormCard.classList.remove('form-disabled');
            if (restrictionBanner) restrictionBanner.classList.add('hidden');
        } else {
            if (createFormCard) createFormCard.classList.add('form-disabled');
            if (restrictionBanner) restrictionBanner.classList.remove('hidden');
        }
    } else {
        btnOpenAuth.classList.remove('hidden');
        userPill.classList.add('hidden');
        if (createFormCard) createFormCard.classList.add('form-disabled');
        if (restrictionBanner) restrictionBanner.classList.remove('hidden');
    }
}

// Navigation Tab Switcher
function navigateTo(view) {
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('hidden'));

    if (view === 'explore') {
        document.getElementById('nav-explore').classList.add('active');
        document.getElementById('view-explore').classList.remove('hidden');
    } else if (view === 'bookings') {
        document.getElementById('nav-bookings').classList.add('active');
        document.getElementById('view-bookings').classList.remove('hidden');
        loadMyBookings();
    } else if (view === 'organizer') {
        document.getElementById('nav-organizer').classList.add('active');
        document.getElementById('view-organizer').classList.remove('hidden');
    }
}

// Fetch Events from API
async function loadEvents(searchQuery = '') {
    try {
        let url = `${API_BASE}/events?category=${encodeURIComponent(selectedCategory)}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            allEvents = data.events;
            renderEventsGrid(allEvents);
            document.getElementById('events-count-label').textContent = `${allEvents.length} events available in India`;
            
            if (document.getElementById('org-stat-events')) {
                document.getElementById('org-stat-events').textContent = allEvents.length;
            }
        }
    } catch (err) {
        console.error('Fetch Events Error:', err);
    }
}

// Render Event Cards Grid
function renderEventsGrid(events) {
    const container = document.getElementById('events-grid-container');

    if (events.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
                <h3>No events found</h3>
                <p>Try selecting another category or clear your search keyword.</p>
            </div>
        `;
        return;
    }

    const isOrganizer = currentUser && (currentUser.role === 'Organizer' || currentUser.role === 'Admin');

    container.innerHTML = events.map(evt => `
        <div class="event-card">
            <div class="event-card-banner" style="background: ${evt.bannerGradient}">
                <span class="badge-cat">${evt.category}</span>
                <span class="badge-tag">${evt.badge || 'Upcoming'}</span>
            </div>
            <div class="event-card-body">
                <h3 class="evt-card-title">${escapeHtml(evt.title)}</h3>
                
                <div class="evt-card-details">
                    <div class="evt-detail-row">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        <span>${evt.date} • ${evt.time}</span>
                    </div>
                    <div class="evt-detail-row">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        <span>${escapeHtml(evt.location)}</span>
                    </div>
                    <div class="evt-detail-row" style="color: var(--accent-cyan);">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                        <span>${evt.availableSeats} of ${evt.totalSeats} seats remaining</span>
                    </div>
                </div>

                <div class="evt-card-footer">
                    <div class="evt-price-box">
                        <span class="evt-price-lbl">Pass Price</span>
                        <span class="evt-price-val">₹${evt.price.toLocaleString('en-IN')}</span>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        ${isOrganizer ? `<button class="btn-delete-evt" onclick="handleDeleteEvent('${evt.id}')" title="Delete Event">Delete</button>` : ''}
                        <button class="btn-book-now" onclick="openBookingModal('${evt.id}')">Book Ticket</button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Category Filter Click Handler
function filterCategory(cat, btn) {
    selectedCategory = cat;
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    loadEvents(document.getElementById('event-search-input').value);
}

// Search Bar Input Handler
function handleSearchFilter() {
    const query = document.getElementById('event-search-input').value;
    loadEvents(query);
}

// Open Booking Checkout Modal
function openBookingModal(eventId) {
    const evt = allEvents.find(e => e.id === eventId);
    if (!evt) return;

    currentBookingEvent = evt;
    currentCheckoutQty = 1;

    document.getElementById('modal-evt-title').textContent = evt.title;
    document.getElementById('modal-evt-badge').textContent = evt.badge || evt.category;
    document.getElementById('modal-evt-date').textContent = evt.date;
    document.getElementById('modal-evt-time').textContent = evt.time;
    document.getElementById('modal-evt-location').textContent = evt.location;
    document.getElementById('modal-evt-desc').textContent = evt.description;

    // Pricing calculation
    document.getElementById('tier-price-gen').textContent = `₹${evt.price.toLocaleString('en-IN')}`;
    document.getElementById('tier-price-vip').textContent = `₹${Math.round(evt.price * 1.6).toLocaleString('en-IN')}`;
    document.getElementById('tier-price-early').textContent = `₹${Math.round(evt.price * 0.85).toLocaleString('en-IN')}`;

    document.getElementById('qty-count').textContent = '1';
    updateCheckoutTotal();

    document.getElementById('booking-modal').classList.remove('hidden');
}

function closeBookingModal() {
    document.getElementById('booking-modal').classList.add('hidden');
}

// Quantity Adjuster
function adjustQty(delta) {
    currentCheckoutQty += delta;
    if (currentCheckoutQty < 1) currentCheckoutQty = 1;
    if (currentBookingEvent && currentCheckoutQty > currentBookingEvent.availableSeats) {
        currentCheckoutQty = currentBookingEvent.availableSeats;
        showToast(`Maximum ${currentBookingEvent.availableSeats} tickets available`, 'info');
    }
    document.getElementById('qty-count').textContent = currentCheckoutQty;
    updateCheckoutTotal();
}

// Update Subtotal Calculation
function updateCheckoutTotal() {
    if (!currentBookingEvent) return;

    const selectedTierInput = document.querySelector('input[name="ticket-tier"]:checked');
    const tier = selectedTierInput ? selectedTierInput.value : 'General Admission';

    let multiplier = 1.0;
    if (tier === 'VIP Pass') multiplier = 1.6;
    if (tier === 'Early Bird') multiplier = 0.85;

    const unitPrice = Math.round(currentBookingEvent.price * multiplier);
    const total = unitPrice * currentCheckoutQty;

    document.getElementById('checkout-total-val').textContent = `₹${total.toLocaleString('en-IN')}`;
}

// Trigger Razorpay Interactive Gateway Modal
function triggerRazorpayCheckout() {
    const token = localStorage.getItem('nexus_jwt_token');

    if (!token || !currentUser) {
        closeBookingModal();
        openAuthModal('login');
        showToast('Please sign in to proceed with Razorpay checkout.', 'info');
        return;
    }

    const selectedTierInput = document.querySelector('input[name="ticket-tier"]:checked');
    const ticketTier = selectedTierInput ? selectedTierInput.value : 'General Admission';

    let multiplier = 1.0;
    if (ticketTier === 'VIP Pass') multiplier = 1.6;
    if (ticketTier === 'Early Bird') multiplier = 0.85;

    const unitPrice = Math.round(currentBookingEvent.price * multiplier);
    const totalAmountINR = unitPrice * currentCheckoutQty;

    // Set modal amounts & descriptions
    document.getElementById('rzp-item-desc').textContent = `${ticketTier} x ${currentCheckoutQty} for ${currentBookingEvent.title}`;
    document.getElementById('rzp-modal-amount').textContent = `₹${totalAmountINR.toLocaleString('en-IN')}`;

    openRazorpayModal();
}

function openRazorpayModal() {
    switchRzpTab('upi');
    document.getElementById('razorpay-modal').classList.remove('hidden');
}

function closeRazorpayModal() {
    document.getElementById('razorpay-modal').classList.add('hidden');
}

function switchRzpTab(tab) {
    document.querySelectorAll('.rzp-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.rzp-view-content').forEach(v => v.classList.add('hidden'));

    if (tab === 'upi') {
        document.getElementById('tab-rzp-upi').classList.add('active');
        document.getElementById('rzp-view-upi').classList.remove('hidden');
    } else if (tab === 'card') {
        document.getElementById('tab-rzp-card').classList.add('active');
        document.getElementById('rzp-view-card').classList.remove('hidden');
    } else if (tab === 'nb') {
        document.getElementById('tab-rzp-nb').classList.add('active');
        document.getElementById('rzp-view-nb').classList.remove('hidden');
    }
}

function executeRazorpayPayment(methodLabel) {
    const payId = 'pay_rzp_' + Math.floor(100000 + Math.random() * 900000);
    closeRazorpayModal();
    showToast(`Razorpay Payment Verified via ${methodLabel}!`, 'success');
    processTicketBooking(`Razorpay Gateway (${methodLabel})`, payId);
}

// Process Ticket Booking Action
async function processTicketBooking(paymentMethod = 'Free Presentation Demo', paymentId = null) {
    const token = localStorage.getItem('nexus_jwt_token');

    if (!token || !currentUser) {
        closeBookingModal();
        openAuthModal('login');
        showToast('Please sign in to complete your ticket booking.', 'info');
        return;
    }

    const selectedTierInput = document.querySelector('input[name="ticket-tier"]:checked');
    const ticketTier = selectedTierInput ? selectedTierInput.value : 'General Admission';

    const btnPayRzp = document.getElementById('btn-pay-razorpay');
    const btnPayDemo = document.getElementById('btn-pay-demo');
    btnPayRzp.disabled = true;
    btnPayDemo.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                eventId: currentBookingEvent.id,
                ticketTier,
                quantity: currentCheckoutQty,
                paymentMethod,
                paymentId
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            closeBookingModal();
            showToast('Ticket Booked Successfully on Eventify!', 'success');
            openPassModal(data.booking);
            loadEvents(); // Refresh seat count
            loadMyBookings();
        } else {
            showToast(data.message || 'Booking failed', 'error');
        }
    } catch (err) {
        showToast('Connection error during checkout.', 'error');
    } finally {
        btnPayRzp.disabled = false;
        btnPayDemo.disabled = false;
    }
}

// Open Digital Pass QR Modal with Real Dynamic QR Code Generator
function openPassModal(booking) {
    document.getElementById('pass-event-title').textContent = booking.eventTitle;
    document.getElementById('pass-user-name').textContent = booking.userName;
    document.getElementById('pass-ticket-code').textContent = booking.ticketCode;
    document.getElementById('pass-date-time').textContent = `${booking.eventDate} • ${booking.eventTime}`;
    document.getElementById('pass-venue').textContent = booking.eventLocation;
    document.getElementById('pass-tier-qty').textContent = `${booking.ticketTier} (x${booking.quantity})`;
    document.getElementById('pass-total-paid').textContent = `₹${booking.totalPrice.toLocaleString('en-IN')}`;

    // Render Real Dynamic QR Code
    const qrContainer = document.getElementById('qrcode-box');
    qrContainer.innerHTML = ''; // Clear previous QR

    const qrPayload = `EVENTIFY PASS\nCode: ${booking.ticketCode}\nAttendee: ${booking.userName}\nEvent: ${booking.eventTitle}\nSeats: ${booking.quantity}\nPayment: ${booking.paymentMethod}\nStatus: VERIFIED_VALID`;

    if (typeof QRCode !== 'undefined') {
        new QRCode(qrContainer, {
            text: qrPayload,
            width: 130,
            height: 130,
            colorDark: "#080a0f",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    } else {
        // Fallback clean SVG QR code if CDN fails
        qrContainer.innerHTML = `
            <svg width="130" height="130" viewBox="0 0 100 100">
                <rect width="100" height="100" fill="#ffffff" rx="6"/>
                <rect x="8" y="8" width="28" height="28" fill="#080a0f"/>
                <rect x="13" y="13" width="18" height="18" fill="#ffffff"/>
                <rect x="17" y="17" width="10" height="10" fill="#080a0f"/>

                <rect x="64" y="8" width="28" height="28" fill="#080a0f"/>
                <rect x="69" y="13" width="18" height="18" fill="#ffffff"/>
                <rect x="73" y="17" width="10" height="10" fill="#080a0f"/>

                <rect x="8" y="64" width="28" height="28" fill="#080a0f"/>
                <rect x="13" y="69" width="18" height="18" fill="#ffffff"/>
                <rect x="17" y="73" width="10" height="10" fill="#080a0f"/>

                <rect x="42" y="10" width="12" height="12" fill="#6366f1"/>
                <rect x="42" y="26" width="12" height="14" fill="#080a0f"/>
                <rect x="10" y="42" width="16" height="12" fill="#080a0f"/>
                <rect x="30" y="42" width="22" height="12" fill="#6366f1"/>
                <rect x="56" y="42" width="16" height="12" fill="#080a0f"/>
                <rect x="76" y="42" width="14" height="12" fill="#6366f1"/>
                <rect x="42" y="58" width="16" height="16" fill="#080a0f"/>
                <rect x="62" y="62" width="14" height="14" fill="#6366f1"/>
                <rect x="78" y="62" width="14" height="26" fill="#080a0f"/>
                <rect x="42" y="78" width="22" height="14" fill="#080a0f"/>
            </svg>
        `;
    }

    document.getElementById('pass-modal').classList.remove('hidden');
}

function closePassModal() {
    document.getElementById('pass-modal').classList.add('hidden');
}

// Load User's Booked Tickets
async function loadMyBookings() {
    const token = localStorage.getItem('nexus_jwt_token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE}/bookings/my`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success) {
            myBookings = data.bookings;
            renderMyBookingsGrid(myBookings);

            const countBadge = document.getElementById('my-bookings-count');
            if (myBookings.length > 0) {
                countBadge.textContent = myBookings.length;
                countBadge.classList.remove('hidden');
            } else {
                countBadge.classList.add('hidden');
            }
        }
    } catch (err) {
        console.error('Fetch Bookings Error:', err);
    }
}

// Render User Booked Tickets
function renderMyBookingsGrid(bookings) {
    const container = document.getElementById('my-bookings-container');

    if (bookings.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
                <h3>No active ticket passes</h3>
                <p>Browse upcoming Indian events and reserve your digital pass today!</p>
                <button class="btn-primary" style="max-width: 200px; margin: 16px auto;" onclick="navigateTo('explore')">Explore Events</button>
            </div>
        `;
        return;
    }

    container.innerHTML = bookings.map(b => `
        <div class="booking-card">
            <div class="booking-card-header">
                <div>
                    <span class="booking-ticket-code">${b.ticketCode}</span>
                    <h3 style="font-size: 1.1rem; margin-top: 6px;">${escapeHtml(b.eventTitle)}</h3>
                </div>
                <span class="booking-status">CONFIRMED</span>
            </div>

            <div class="evt-card-details">
                <div class="evt-detail-row">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <span>${b.eventDate} • ${b.eventTime}</span>
                </div>
                <div class="evt-detail-row">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span>${escapeHtml(b.eventLocation)}</span>
                </div>
                <div class="evt-detail-row">
                    <span style="font-weight: 700; color: var(--accent-cyan);">${b.ticketTier} (x${b.quantity})</span>
                    <span>Total: ₹${b.totalPrice.toLocaleString('en-IN')}</span>
                </div>
            </div>

            <div class="booking-actions">
                <button class="btn-secondary" style="flex: 1;" onclick='openPassModal(${JSON.stringify(b)})'>View Digital Pass</button>
                <button class="btn-danger-sm" onclick="handleCancelBooking('${b.id}')">Cancel</button>
            </div>
        </div>
    `).join('');
}

// Cancel Booking
async function handleCancelBooking(bookingId) {
    const token = localStorage.getItem('nexus_jwt_token');
    if (!token) return;

    if (!confirm('Are you sure you want to cancel this Eventify booking pass?')) return;

    try {
        const response = await fetch(`${API_BASE}/bookings/${bookingId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok && data.success) {
            showToast('Booking pass cancelled.', 'info');
            loadMyBookings();
            loadEvents();
        } else {
            showToast(data.message || 'Failed to cancel booking', 'error');
        }
    } catch (err) {
        showToast('Error cancelling booking.', 'error');
    }
}

// Handle Event Publishing (Organizer Studio)
async function handleCreateEvent(e) {
    e.preventDefault();
    const token = localStorage.getItem('nexus_jwt_token');

    if (!token || !currentUser) {
        openAuthModal('login');
        showToast('Organizer authentication required.', 'info');
        return;
    }

    if (currentUser.role !== 'Organizer' && currentUser.role !== 'Admin') {
        showToast('Organizer role required to publish events.', 'error');
        return;
    }

    const title = document.getElementById('evt-title').value.trim();
    const category = document.getElementById('evt-category').value;
    const date = document.getElementById('evt-date').value;
    const time = document.getElementById('evt-time').value.trim();
    const price = document.getElementById('evt-price').value;
    const location = document.getElementById('evt-location').value.trim();
    const totalSeats = document.getElementById('evt-seats').value;
    const description = document.getElementById('evt-desc').value.trim();

    try {
        const response = await fetch(`${API_BASE}/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title, category, date, time, price, location, totalSeats, description })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showToast('New Event Published on Eventify!', 'success');
            document.getElementById('create-event-form').reset();
            loadEvents();
            navigateTo('explore');
        } else {
            showToast(data.message || 'Failed to publish event', 'error');
        }
    } catch (err) {
        showToast('Error publishing event.', 'error');
    }
}

// Handle Event Deletion (Organizer Only)
async function handleDeleteEvent(eventId) {
    const token = localStorage.getItem('nexus_jwt_token');

    if (!token || !currentUser || (currentUser.role !== 'Organizer' && currentUser.role !== 'Admin')) {
        showToast('Organizer privileges required to delete events.', 'error');
        return;
    }

    if (!confirm('Are you sure you want to delete this event from Eventify?')) return;

    try {
        const response = await fetch(`${API_BASE}/events/${eventId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showToast('Event deleted successfully.', 'info');
            loadEvents();
        } else {
            showToast(data.message || 'Failed to delete event.', 'error');
        }
    } catch (err) {
        showToast('Error deleting event.', 'error');
    }
}

// AUTH MODAL LOGIC
function openAuthModal(mode = 'login') {
    switchModalAuthTab(mode);
    document.getElementById('auth-modal').classList.remove('hidden');
}

function closeAuthModal() {
    document.getElementById('auth-modal').classList.add('hidden');
}

function switchModalAuthTab(mode) {
    const tabLogin = document.getElementById('modal-tab-login');
    const tabReg = document.getElementById('modal-tab-register');
    const formLogin = document.getElementById('modal-login-form');
    const formReg = document.getElementById('modal-register-form');
    const title = document.getElementById('modal-auth-title');
    const subtitle = document.getElementById('modal-auth-subtitle');

    if (mode === 'login') {
        tabLogin.classList.add('active');
        tabReg.classList.remove('active');
        formLogin.classList.remove('hidden');
        formReg.classList.add('hidden');
        title.textContent = 'Sign In to Eventify';
        subtitle.textContent = 'Access your digital ticket passes or manage your events';
    } else {
        tabReg.classList.add('active');
        tabLogin.classList.remove('active');
        formReg.classList.remove('hidden');
        formLogin.classList.add('hidden');
        title.textContent = 'Create Eventify Account';
        subtitle.textContent = 'Register to book tickets and manage event passes';
    }
}

function fillQuickAuth(email, pass) {
    document.getElementById('modal-login-email').value = email;
    document.getElementById('modal-login-password').value = pass;
    showToast('Demo account credentials auto-filled', 'info');
}

async function handleModalLogin(e) {
    e.preventDefault();
    const email = document.getElementById('modal-login-email').value.trim();
    const password = document.getElementById('modal-login-password').value;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            localStorage.setItem('nexus_jwt_token', data.token);
            currentUser = data.user;
            renderAuthNavbar(currentUser);
            closeAuthModal();
            loadMyBookings();
            showToast(`Welcome, ${currentUser.fullName}!`, 'success');
        } else {
            showToast(data.message || 'Login failed', 'error');
        }
    } catch (err) {
        showToast('Connection error during login.', 'error');
    }
}

async function handleModalRegister(e) {
    e.preventDefault();
    const fullName = document.getElementById('modal-reg-name').value.trim();
    const email = document.getElementById('modal-reg-email').value.trim();
    const role = document.getElementById('modal-reg-role').value;
    const password = document.getElementById('modal-reg-password').value;

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, email, password, role })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            localStorage.setItem('nexus_jwt_token', data.token);
            currentUser = data.user;
            renderAuthNavbar(currentUser);
            closeAuthModal();
            loadMyBookings();
            showToast('Account registered successfully on Eventify!', 'success');
        } else {
            showToast(data.message || 'Registration failed', 'error');
        }
    } catch (err) {
        showToast('Connection error during registration.', 'error');
    }
}

function handleLogout() {
    localStorage.removeItem('nexus_jwt_token');
    currentUser = null;
    myBookings = [];
    renderAuthNavbar(null);
    renderMyBookingsGrid([]);
    showToast('Logged out of session.', 'info');
}

// Utility Toast Notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
