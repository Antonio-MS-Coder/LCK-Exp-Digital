// Stripe Integration for LCK Experience Digital
// This handles payment processing and validation

const StripeIntegration = {
    // Your Stripe publishable key (LIVE)
    stripePublishableKey: 'pk_live_xIt38KoSpBKHsLEG6SN4fb7K00zKbJ96Qj',
    functionsUrl: 'https://us-central1-lck-experience.cloudfunctions.net',

    // Initialize Stripe
    init() {
        // Check if Stripe is loaded
        if (typeof Stripe === 'undefined') {
            console.error('Stripe.js not loaded');
            return false;
        }

        this.stripe = Stripe(this.stripePublishableKey);
        return true;
    },

    // Check if user has already paid
    async checkPaymentStatus(email) {
        try {
            const response = await fetch(`${this.functionsUrl}/checkPaymentStatus`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error checking payment status:', error);
            return { hasPaid: false, error: error.message };
        }
    },

    // Create checkout session and redirect to Stripe
    async createCheckoutSession(email, userId) {
        try {
            // First check if user already has access (paid or coupon)
            const accessStatus = await this.validateAccess(email);

            if (accessStatus.hasAccess) {
                console.log('User already has access:', accessStatus.accessType);
                return {
                    success: false,
                    error: accessStatus.accessType === 'coupon' ?
                        'Ya tienes acceso con cupón. No necesitas pagar.' :
                        'Ya has realizado el pago anteriormente',
                    hasAccess: true,
                    accessType: accessStatus.accessType
                };
            }

            // Create checkout session
            const response = await fetch(`${this.functionsUrl}/createCheckoutSession`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    userId: userId || email.replace(/\./g, '_')
                })
            });

            const data = await response.json();

            if (data.error) {
                return {
                    success: false,
                    error: data.error,
                    hasPaid: data.hasPaid || false
                };
            }

            // Redirect to Stripe Checkout
            if (data.url) {
                window.location.href = data.url;
            } else if (data.sessionId) {
                // Use Stripe.js to redirect
                const { error } = await this.stripe.redirectToCheckout({
                    sessionId: data.sessionId
                });

                if (error) {
                    console.error('Stripe redirect error:', error);
                    return {
                        success: false,
                        error: error.message
                    };
                }
            }

            return {
                success: true,
                sessionId: data.sessionId
            };

        } catch (error) {
            console.error('Error creating checkout session:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    // Verify payment after returning from Stripe
    async verifyPayment(sessionId, email) {
        try {
            const response = await fetch(`${this.functionsUrl}/verifyPaymentAndGrantAccess`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId,
                    email
                })
            });

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('Error verifying payment:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    // Handle payment success (called on success page)
    async handlePaymentSuccess() {
        // Get session ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        const paymentStatus = urlParams.get('payment');

        if (paymentStatus !== 'success' || !sessionId) {
            return {
                success: false,
                error: 'Invalid payment confirmation'
            };
        }

        // Get current user
        const auth = firebase.auth();
        const user = auth.currentUser;

        if (!user) {
            console.log('No authenticated user');
            return {
                success: false,
                error: 'Usuario no autenticado'
            };
        }

        // Verify payment with backend
        const verification = await this.verifyPayment(sessionId, user.email);

        if (verification.success) {
            // Update local session
            sessionStorage.setItem('hasPaid', 'true');
            sessionStorage.setItem('accessType', 'paid');

            // Show success message
            this.showPaymentSuccessMessage();

            // Redirect to conferences after a delay
            setTimeout(() => {
                window.location.href = '/conferences.html';
            }, 3000);
        }

        return verification;
    },

    // Show payment success message
    showPaymentSuccessMessage() {
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            text-align: center;
            z-index: 10000;
            max-width: 400px;
        `;

        message.innerHTML = `
            <div style="color: #4CAF50; font-size: 48px; margin-bottom: 20px;">
                ✓
            </div>
            <h2 style="color: #333; margin-bottom: 15px;">
                ¡Pago Exitoso!
            </h2>
            <p style="color: #666; margin-bottom: 20px;">
                Tu pago se ha procesado correctamente.
                Ahora tienes acceso completo a todas las conferencias.
            </p>
            <p style="color: #999; font-size: 14px;">
                Redirigiendo a las conferencias...
            </p>
        `;

        document.body.appendChild(message);
    },

    // Check and update payment status in UI
    async updatePaymentUI() {
        const auth = firebase.auth();
        const user = auth.currentUser;

        if (!user) return;

        const paymentStatus = await this.checkPaymentStatus(user.email);

        if (paymentStatus.hasPaid) {
            // Hide payment button
            const payButton = document.getElementById('payButton');
            if (payButton) {
                payButton.style.display = 'none';
            }

            // Show access granted message
            const accessMessage = document.getElementById('accessGranted');
            if (accessMessage) {
                accessMessage.style.display = 'block';
            }

            // Update any payment status indicators
            const statusElements = document.querySelectorAll('.payment-status');
            statusElements.forEach(el => {
                el.textContent = 'Pagado';
                el.classList.add('paid');
            });
        }
    },

    // Validate payment before allowing access
    async validateAccess(email) {
        const paymentStatus = await this.checkPaymentStatus(email);

        // Check if user has paid or has a valid coupon
        const database = firebase.database();
        const emailKey = email.replace(/\./g, '_');
        const userSnapshot = await database.ref(`users/${emailKey}`).once('value');
        const userData = userSnapshot.val();

        const hasAccess = paymentStatus.hasPaid ||
                         (userData && userData.accessGranted) ||
                         (userData && userData.accessType === 'coupon');

        return {
            hasAccess,
            accessType: userData?.accessType || (paymentStatus.hasPaid ? 'paid' : null),
            hasPaid: paymentStatus.hasPaid,
            paymentDate: paymentStatus.paymentDate
        };
    }
};

// Auto-initialize when script loads
document.addEventListener('DOMContentLoaded', () => {
    StripeIntegration.init();

    // Check for payment success redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
        StripeIntegration.handlePaymentSuccess();
    }

    // Update payment UI if user is logged in
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            StripeIntegration.updatePaymentUI();
        }
    });
});

// Export for use in other scripts
window.StripeIntegration = StripeIntegration;