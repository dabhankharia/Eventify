/**
 * Utility to dynamically load Razorpay Checkout Script (checkout.razorpay.com/v1/checkout.js)
 */
export function loadRazorpayScript() {
    return new Promise((resolve) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}

/**
 * Trigger Real Razorpay Test/Live Mode Popup Dialog
 */
export async function launchRazorpayPayment({
    orderData,
    user,
    onSuccess,
    onFailure
}) {
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
        onFailure?.('Failed to load Razorpay SDK. Please check your internet connection.');
        return;
    }

    const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Eventify',
        description: `${orderData.event?.title || 'Event'} Ticket Pass`,
        order_id: orderData.orderId,
        handler: function (response) {
            // response: { razorpay_payment_id, razorpay_order_id, razorpay_signature }
            onSuccess(response);
        },
        prefill: {
            name: user?.fullName || '',
            email: user?.email || '',
            contact: ''
        },
        notes: {
            eventId: orderData.event?.id,
            platform: 'Eventify Web Platform'
        },
        theme: {
            color: '#6366f1'
        },
        modal: {
            ondismiss: function () {
                onFailure?.('Payment cancelled by user.');
            }
        }
    };

    try {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
            onFailure?.(response.error.description || 'Payment transaction failed.');
        });
        rzp.open();
    } catch (err) {
        onFailure?.(err.message || 'Error opening Razorpay checkout.');
    }
}
