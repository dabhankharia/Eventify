const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

// -------------------------------------------------------------
// EMAIL SERVICE CONFIGURATION
// -------------------------------------------------------------
let mailTransporter = null;

function getMailTransporter() {
    if (mailTransporter) return mailTransporter;

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT, 10) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
        mailTransporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass }
        });
    } else {
        mailTransporter = null;
    }
    return mailTransporter;
}

// Helper to send Email with rich HTML formatting & optional attachments (inline CID images)
async function sendEmail({ to, subject, html, text, attachments = [] }) {
    const fromAddress = process.env.EMAIL_FROM || '"Eventify" <no-reply@eventify.in>';
    const transporter = getMailTransporter();

    if (transporter) {
        try {
            const info = await transporter.sendMail({
                from: fromAddress,
                to,
                subject,
                text,
                html,
                attachments
            });
            console.log(`📧 [Eventify Mail] Email successfully delivered to ${to}. MessageId: ${info.messageId}`);
            return { success: true, messageId: info.messageId };
        } catch (err) {
            console.warn(`[Eventify Mail] Delivery fallback for ${to}: ${err.message}`);
            return { success: false, error: err.message };
        }
    } else {
        // Dev log
        console.log(`[Eventify Mail Service] (SMTP not configured — preview):`);
        console.log(`   To: ${to}`);
        console.log(`   Subject: ${subject}`);
        return { success: true, simulated: true };
    }
}

// -------------------------------------------------------------
// APPLICATION NOTIFICATION WORKFLOWS
// -------------------------------------------------------------

/**
 * 1. REGISTRATION CONFIRMATION EMAIL
 */
async function sendRegistrationConfirmation({ recipient, verificationLink }) {
    const { fullName, email } = recipient;
    if (!email) return { success: false, message: 'No email address provided' };

    const subject = 'Confirm your Eventify Account Registration';
    const text = `Hello ${fullName || 'there'},\n\nThank you for signing up on Eventify! Please click the confirmation link below to finalize and activate your account:\n\n${verificationLink}\n\nThis link will expire in 24 hours.\n\nBest regards,\nThe Eventify Team`;

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); padding: 32px 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 26px; color: #ffffff; letter-spacing: -0.5px;">Eventify</h1>
            <p style="margin: 6px 0 0 0; color: #e0e7ff; font-size: 14px;">Next-Gen Event Booking & Management</p>
        </div>
        <div style="padding: 32px 24px;">
            <h2 style="margin-top: 0; font-size: 20px; color: #ffffff;">Finalize Your Registration</h2>
            <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
                Hello <strong style="color: #f1f5f9;">${fullName || 'there'}</strong>,<br/>
                Welcome to Eventify! To complete your registration and activate ticket booking and organizing privileges, please confirm your email address.
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="${verificationLink}" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                    Confirm My Registration & Activate
                </a>
            </div>
            <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
                Or copy and paste this verification link into your browser:<br/>
                <a href="${verificationLink}" style="color: #818cf8; word-break: break-all;">${verificationLink}</a>
            </p>
            <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid #1e293b; padding-top: 16px;">
                This link will expire in 24 hours. If you did not create an account on Eventify, please ignore this email.
            </p>
        </div>
    </div>
    `;

    return await sendEmail({ to: email, subject, text, html });
}

/**
 * 2. TICKET BOOKING CONFIRMATION EMAIL (WITH EMBEDDED QR CODE)
 */
async function sendBookingNotification({ recipient, booking, event }) {
    const { fullName, email } = recipient;
    if (!email) return { success: false, message: 'No email address' };

    const formattedPrice = `₹${booking.totalPrice.toLocaleString('en-IN')}`;
    const subject = `Booking Confirmed: ${event.title} [Pass #${booking.ticketCode}]`;
    const text = `Hi ${fullName || 'Attendee'},\n\nYour ticket booking for "${event.title}" is confirmed!\n\nTicket Code: ${booking.ticketCode}\nTier: ${booking.ticketTier}\nQuantity: ${booking.quantity} Pass(es)\nTotal Paid: ${formattedPrice}\nEvent Date: ${event.date} (${event.time})\nVenue: ${event.location}\n\nPlease present the QR code in this email or your Eventify digital pass at the entrance gate.\n\nThank you,\nEventify`;

    // 1. Generate QR Code containing verifiable pass payload
    const qrPayload = JSON.stringify({
        app: 'Eventify',
        ticketCode: booking.ticketCode,
        attendee: fullName || booking.userName,
        event: event.title,
        seats: booking.quantity,
        tier: booking.ticketTier,
        date: event.date,
        time: event.time,
        location: event.location,
        payment: booking.paymentMethod,
        verified: true
    });

    let qrBuffer = null;
    let qrDataUrl = null;
    const attachments = [];

    try {
        qrBuffer = await QRCode.toBuffer(qrPayload, {
            errorCorrectionLevel: 'H',
            type: 'png',
            margin: 2,
            width: 260,
            color: {
                dark: '#0f172a',
                light: '#ffffff'
            }
        });

        // Add inline CID attachment for full compatibility with Gmail, Outlook, Apple Mail
        attachments.push({
            filename: `eventify-pass-${booking.ticketCode}.png`,
            content: qrBuffer,
            cid: 'ticketqrcode'
        });

        qrDataUrl = await QRCode.toDataURL(qrPayload, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 260,
            color: {
                dark: '#0f172a',
                light: '#ffffff'
            }
        });
    } catch (qrErr) {
        console.warn('QR code generation error:', qrErr.message);
    }

    // Use inline CID image tag (fallback to dataUrl if CID is not rendered by client)
    const qrImageSrc = qrBuffer ? 'cid:ticketqrcode' : (qrDataUrl || '');

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 28px 24px; text-align: center;">
            <span style="background: rgba(255,255,255,0.2); color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Booking Confirmed</span>
            <h1 style="margin: 12px 0 0 0; font-size: 24px; color: #ffffff;">Ticket Pass Ready!</h1>
        </div>

        <div style="padding: 28px 24px;">
            <p style="color: #94a3b8; font-size: 15px; margin-top: 0;">
                Hi <strong style="color: #f1f5f9;">${fullName || 'Attendee'}</strong>, your seats are locked in for:
            </p>

            <!-- Event Details Box -->
            <div style="background: #1e293b; border-radius: 12px; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #f8fafc; font-size: 18px;">${event.title}</h3>
                <p style="margin: 4px 0; color: #94a3b8; font-size: 14px;">📅 <strong>Date:</strong> ${event.date} | ${event.time}</p>
                <p style="margin: 4px 0; color: #94a3b8; font-size: 14px;">📍 <strong>Location:</strong> ${event.location}</p>
                <p style="margin: 4px 0; color: #94a3b8; font-size: 14px;">🎟️ <strong>Tier:</strong> ${booking.ticketTier} (Qty: ${booking.quantity} Pass)</p>
                <p style="margin: 4px 0; color: #94a3b8; font-size: 14px;">💳 <strong>Total:</strong> ${formattedPrice} (${booking.paymentMethod})</p>
                <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #334155; font-family: monospace; font-size: 16px; color: #34d399; font-weight: bold;">
                    Pass Code: ${booking.ticketCode}
                </div>
            </div>

            <!-- QR Code Pass Section -->
            ${qrImageSrc ? `
            <div style="background: #1e293b; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; border: 1px solid #334155;">
                <span style="display: inline-block; background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); font-size: 11px; font-weight: 700; letter-spacing: 1px; padding: 4px 10px; border-radius: 12px; text-transform: uppercase; margin-bottom: 14px;">
                    ⚡ Official Entry Pass QR Code
                </span>
                <div style="background: #ffffff; padding: 16px; border-radius: 12px; display: inline-block; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);">
                    <img src="${qrImageSrc}" alt="Event Pass QR Code" width="180" height="180" style="display: block; margin: 0 auto; border: 0;" />
                </div>
                <p style="color: #94a3b8; font-size: 13px; margin: 14px 0 0 0; font-family: monospace;">
                    Code: <strong style="color: #f1f5f9;">${booking.ticketCode}</strong>
                </p>
                <p style="color: #64748b; font-size: 12px; margin: 6px 0 0 0;">
                    Scan at the venue entrance gate for instant gate check-in
                </p>
            </div>
            ` : ''}

            <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
                Present this email with the QR code above or access your pass anytime directly on your Eventify dashboard.
            </p>
        </div>
    </div>
    `;

    return await sendEmail({ to: email, subject, text, html, attachments });
}

/**
 * 3. EVENT PUBLISHED EMAIL (Organizer)
 */
async function sendEventOrganizedNotification({ recipient, event }) {
    const { fullName, email } = recipient;
    if (!email) return { success: false, message: 'No email address' };

    const subject = `Event Published: "${event.title}" is Live on Eventify!`;
    const text = `Hi ${fullName || 'Organizer'},\n\nCongratulations! Your event "${event.title}" has been published and is now live for attendees to explore and book.\n\nCategory: ${event.category}\nDate & Time: ${event.date} (${event.time})\nVenue: ${event.location}\nCapacity: ${event.totalSeats} seats\nTicket Price: ₹${event.price.toLocaleString('en-IN')}\n\nYou can track live ticket sales and metrics in your Organizer Studio.\n\nBest regards,\nEventify Team`;

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #3b82f6 100%); padding: 28px 24px; text-align: center;">
            <span style="background: rgba(255,255,255,0.2); color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Organizer Portal</span>
            <h1 style="margin: 12px 0 0 0; font-size: 24px; color: #ffffff;">Event Published Successfully!</h1>
        </div>
        <div style="padding: 28px 24px;">
            <p style="color: #94a3b8; font-size: 15px; margin-top: 0;">
                Hi <strong style="color: #f1f5f9;">${fullName || 'Organizer'}</strong>, your new event is live on the Eventify marketplace:
            </p>
            <div style="background: #1e293b; border-radius: 12px; padding: 20px; border-left: 4px solid #6366f1; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #f8fafc; font-size: 18px;">${event.title}</h3>
                <p style="margin: 4px 0; color: #94a3b8; font-size: 14px;">🏷️ <strong>Category:</strong> ${event.category}</p>
                <p style="margin: 4px 0; color: #94a3b8; font-size: 14px;">📅 <strong>Schedule:</strong> ${event.date} (${event.time})</p>
                <p style="margin: 4px 0; color: #94a3b8; font-size: 14px;">📍 <strong>Venue:</strong> ${event.location}</p>
                <p style="margin: 4px 0; color: #94a3b8; font-size: 14px;">👥 <strong>Capacity:</strong> ${event.totalSeats} seats</p>
                <p style="margin: 4px 0; color: #94a3b8; font-size: 14px;">💵 <strong>Base Price:</strong> ₹${event.price.toLocaleString('en-IN')}</p>
            </div>
            <p style="color: #64748b; font-size: 13px;">
                Monitor real-time attendee registrations, revenue forecasts, and analytics inside your Eventify Organizer Studio.
            </p>
        </div>
    </div>
    `;

    return await sendEmail({ to: email, subject, text, html });
}

/**
 * 4. TICKET CANCELLATION EMAIL
 */
async function sendCancellationNotification({ recipient, booking, event }) {
    const { fullName, email } = recipient;
    if (!email) return { success: false, message: 'No email address' };

    const subject = `Booking Cancelled: Pass #${booking.ticketCode} for ${event?.title || 'Event'}`;
    const text = `Hi ${fullName || 'Attendee'},\n\nYour booking pass #${booking.ticketCode} for "${event?.title || 'the event'}" has been cancelled.\n\n${booking.quantity} seat(s) have been released back to event inventory.\n\nRefund status: If applicable, payment will be credited back via original method (${booking.paymentMethod}).\n\nThank you,\nEventify`;

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); padding: 28px 24px; text-align: center;">
            <span style="background: rgba(255,255,255,0.2); color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Booking Cancelled</span>
            <h1 style="margin: 12px 0 0 0; font-size: 24px; color: #ffffff;">Ticket Pass Cancelled</h1>
        </div>
        <div style="padding: 28px 24px;">
            <p style="color: #94a3b8; font-size: 15px; margin-top: 0;">
                Hi <strong style="color: #f1f5f9;">${fullName || 'Attendee'}</strong>, your booking has been cancelled as requested:
            </p>
            <div style="background: #1e293b; border-radius: 12px; padding: 20px; border-left: 4px solid #ef4444; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #f8fafc; font-size: 18px;">${event?.title || 'Event Booking'}</h3>
                <p style="margin: 4px 0; color: #94a3b8; font-size: 14px;">🎟️ <strong>Cancelled Pass:</strong> ${booking.ticketCode}</p>
                <p style="margin: 4px 0; color: #94a3b8; font-size: 14px;">👥 <strong>Seats Restored:</strong> ${booking.quantity} Pass(es)</p>
                <p style="margin: 4px 0; color: #94a3b8; font-size: 14px;">💳 <strong>Amount:</strong> ₹${booking.totalPrice.toLocaleString('en-IN')}</p>
            </div>
            <p style="color: #64748b; font-size: 13px;">
                The seats have been safely returned to the event quota. If payment was made through an online gateway, any eligible refund will be processed within standard banking days.
            </p>
        </div>
    </div>
    `;

    return await sendEmail({ to: email, subject, text, html });
}

module.exports = {
    sendEmail,
    sendRegistrationConfirmation,
    sendBookingNotification,
    sendEventOrganizedNotification,
    sendCancellationNotification
};
