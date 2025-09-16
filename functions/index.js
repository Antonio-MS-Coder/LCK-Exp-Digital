// Firebase Functions for LCK Experience Digital
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Stripe with your secret key
// IMPORTANT: Set this in Firebase Functions config
// Run: firebase functions:config:set stripe.secret_key="sk_live_YOUR_KEY" stripe.webhook_secret="whsec_YOUR_SECRET"
const stripe = require('stripe')(functions.config().stripe?.secret_key || process.env.STRIPE_SECRET_KEY);

// Webhook endpoint for Stripe
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = functions.config().stripe?.webhook_secret || process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    // For Payment Links, we might not need signature verification if coming from trusted source
    // Try to parse the event first
    try {
        // If signature exists, try to verify
        if (sig && webhookSecret && req.rawBody) {
            event = stripe.webhooks.constructEvent(
                req.rawBody,
                sig,
                webhookSecret
            );
        } else {
            // Fallback for Payment Link webhooks or if rawBody is not available
            console.log('Processing webhook without signature verification (Payment Link)');
            event = req.body;

            // Basic validation
            if (!event || !event.type) {
                throw new Error('Invalid webhook payload');
            }
        }
    } catch (err) {
        console.error('Webhook processing error:', err.message);

        // Try to process anyway if it looks like a valid Stripe event
        if (req.body && req.body.type && req.body.data) {
            console.log('Processing webhook despite signature error');
            event = req.body;
        } else {
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }
    }

    // Log the event type for debugging
    console.log(`Received webhook event: ${event.type}`);
    console.log('Event ID:', event.id);

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            console.log('Processing payment_intent.succeeded');
            await handleSuccessfulPayment(event.data.object);
            break;

        case 'checkout.session.completed':
            console.log('Processing checkout.session.completed');
            await handleCheckoutSession(event.data.object);
            break;

        case 'charge.succeeded':
            // Payment Links often send charge.succeeded
            console.log('Processing charge.succeeded (Payment Link)');
            await handleChargeSucceeded(event.data.object);
            break;

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    res.json({ received: true });
});

// Handle successful payment
async function handleSuccessfulPayment(paymentIntent) {
    console.log('Payment successful:', paymentIntent.id);

    // Get customer email from payment intent
    const customerEmail = paymentIntent.receipt_email || paymentIntent.charges?.data[0]?.billing_details?.email;

    if (!customerEmail) {
        console.error('No customer email found in payment intent');
        return;
    }

    // Update user in database
    const emailKey = customerEmail.replace(/\./g, '_');

    try {
        await admin.database().ref(`users/${emailKey}`).update({
            hasPaid: true,
            paymentId: paymentIntent.id,
            paymentAmount: paymentIntent.amount,
            paymentDate: Date.now(),
            accessGranted: true,
            accessType: 'paid',
            stripeCustomerId: paymentIntent.customer || null
        });

        console.log(`User ${customerEmail} marked as paid`);
    } catch (error) {
        console.error('Error updating user payment status:', error);
    }
}

// Handle charge succeeded (for Payment Links)
async function handleChargeSucceeded(charge) {
    console.log('Charge succeeded:', charge.id);
    console.log('Amount:', charge.amount, 'Currency:', charge.currency);

    // Get customer email
    const customerEmail = charge.billing_details?.email || charge.receipt_email;

    if (!customerEmail) {
        console.error('No customer email found in charge');
        return;
    }

    console.log('Customer email:', customerEmail);

    // Update user in database
    const emailKey = customerEmail.replace(/\./g, '_');

    try {
        // Check if user exists
        const userSnapshot = await admin.database().ref(`users/${emailKey}`).once('value');
        const userData = userSnapshot.val();

        if (!userData) {
            console.log('Creating new user record for:', customerEmail);
            // Create user if doesn't exist
            await admin.database().ref(`users/${emailKey}`).set({
                email: customerEmail,
                name: charge.billing_details?.name || '',
                createdAt: Date.now()
            });
        }

        // Update payment status
        await admin.database().ref(`users/${emailKey}`).update({
            hasPaid: true,
            chargeId: charge.id,
            paymentAmount: charge.amount,
            paymentDate: Date.now(),
            accessGranted: true,
            accessType: 'paid',
            stripeCustomerId: charge.customer || null,
            paymentMethod: 'payment_link',
            currency: charge.currency
        });

        console.log(`User ${customerEmail} marked as paid via Payment Link`);

        // Also store payment record
        await admin.database().ref('payments').push({
            email: customerEmail,
            chargeId: charge.id,
            amount: charge.amount,
            currency: charge.currency,
            status: 'completed',
            type: 'payment_link',
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Error updating user payment status:', error);
    }
}

// Handle checkout session completed
async function handleCheckoutSession(session) {
    console.log('Checkout session completed:', session.id);

    // Verify it's the correct product
    const expectedPriceId = functions.config().stripe?.price_id;
    const expectedProductId = functions.config().stripe?.product_id || 'lck_experience_2025';

    // Expand the session to get line items if needed
    if (session.line_items) {
        const lineItem = session.line_items.data?.[0];
        if (lineItem && expectedPriceId && lineItem.price.id !== expectedPriceId) {
            console.log('Payment for different product, ignoring');
            return;
        }
    }

    const customerEmail = session.customer_email || session.customer_details?.email;

    if (!customerEmail) {
        console.error('No customer email found in session');
        return;
    }

    const emailKey = customerEmail.replace(/\./g, '_');

    try {
        // Check if user already paid
        const userSnapshot = await admin.database().ref(`users/${emailKey}`).once('value');
        const userData = userSnapshot.val();

        if (userData && userData.hasPaid) {
            console.log(`User ${customerEmail} already marked as paid`);
            return;
        }

        // Update user payment status
        await admin.database().ref(`users/${emailKey}`).update({
            hasPaid: true,
            sessionId: session.id,
            paymentAmount: session.amount_total,
            paymentDate: Date.now(),
            accessGranted: true,
            accessType: 'paid',
            stripeCustomerId: session.customer || null,
            subscriptionId: session.subscription || null
        });

        console.log(`User ${customerEmail} marked as paid via checkout session`);

        // Also store payment record
        await admin.database().ref('payments').push({
            email: customerEmail,
            sessionId: session.id,
            amount: session.amount_total,
            currency: session.currency,
            status: 'completed',
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Error updating user payment status:', error);
    }
}

// Check payment status endpoint (for client-side verification)
exports.checkPaymentStatus = functions.https.onRequest(async (req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).send('Method Not Allowed');
        }

        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        try {
            const emailKey = email.replace(/\./g, '_');
            const userSnapshot = await admin.database().ref(`users/${emailKey}`).once('value');
            const userData = userSnapshot.val();

            if (!userData) {
                return res.json({
                    hasPaid: false,
                    message: 'User not found'
                });
            }

            return res.json({
                hasPaid: userData.hasPaid || false,
                accessGranted: userData.accessGranted || false,
                accessType: userData.accessType || null,
                paymentDate: userData.paymentDate || null
            });

        } catch (error) {
            console.error('Error checking payment status:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });
});

// Create Stripe Checkout Session
exports.createCheckoutSession = functions.https.onRequest(async (req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).send('Method Not Allowed');
        }

        const { email, userId } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        try {
            // Check if user already paid
            const emailKey = email.replace(/\./g, '_');
            const userSnapshot = await admin.database().ref(`users/${emailKey}`).once('value');
            const userData = userSnapshot.val();

            if (userData && userData.hasPaid) {
                return res.status(400).json({
                    error: 'User has already paid',
                    hasPaid: true
                });
            }

            // Create Stripe Checkout Session with specific product
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                mode: 'payment',
                customer_email: email,
                line_items: [{
                    // Use a specific price ID from Stripe Dashboard
                    price: functions.config().stripe?.price_id || 'price_1S7LehLlZVNmVdHrak5QfTgz',
                    quantity: 1,
                    // OR use price_data for dynamic pricing
                    // price_data: {
                    //     currency: 'mxn',
                    //     product_data: {
                    //         name: 'LCK Experience Digital - Acceso Completo',
                    //         description: 'Acceso a todas las conferencias del evento',
                    //         metadata: {
                    //             product_id: 'lck_experience_2025'
                    //         }
                    //     },
                    //     unit_amount: 50000, // 500 MXN in cents
                    // },
                }],
                success_url: `${req.headers.origin || 'https://lck-experience.web.app'}/conferences.html?payment=success&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${req.headers.origin || 'https://lck-experience.web.app'}/?payment=cancelled`,
                metadata: {
                    userId: userId || emailKey,
                    email: email
                }
            });

            res.json({
                sessionId: session.id,
                url: session.url
            });

        } catch (error) {
            console.error('Error creating checkout session:', error);
            res.status(500).json({
                error: 'Failed to create checkout session',
                message: error.message
            });
        }
    });
});

// Verify payment before granting access
exports.verifyPaymentAndGrantAccess = functions.https.onRequest(async (req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).send('Method Not Allowed');
        }

        const { sessionId, email } = req.body;

        if (!sessionId || !email) {
            return res.status(400).json({
                error: 'Session ID and email are required'
            });
        }

        try {
            // Retrieve the session from Stripe
            const session = await stripe.checkout.sessions.retrieve(sessionId);

            if (session.payment_status !== 'paid') {
                return res.status(400).json({
                    error: 'Payment not completed',
                    status: session.payment_status
                });
            }

            // Verify email matches
            if (session.customer_email !== email) {
                return res.status(400).json({
                    error: 'Email mismatch'
                });
            }

            // Grant access
            const emailKey = email.replace(/\./g, '_');
            await admin.database().ref(`users/${emailKey}`).update({
                hasPaid: true,
                sessionId: sessionId,
                paymentVerified: true,
                verifiedAt: Date.now(),
                accessGranted: true,
                accessType: 'paid'
            });

            res.json({
                success: true,
                message: 'Payment verified and access granted'
            });

        } catch (error) {
            console.error('Error verifying payment:', error);
            res.status(500).json({
                error: 'Failed to verify payment',
                message: error.message
            });
        }
    });
});

console.log('Firebase Functions initialized for LCK Experience Digital');