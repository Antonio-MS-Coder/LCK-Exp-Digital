// Configuration
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/test_YOUR_PAYMENT_LINK'; // Replace with your Stripe Payment Link

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics();
const database = firebase.database();

// Mount when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    checkReturnFromPayment();
});

function initializeEventListeners() {
    // Tab switching
    const tabs = document.querySelectorAll('.option-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab));
    });

    // Form submissions
    document.getElementById('couponForm').addEventListener('submit', handleCouponSubmit);
    document.getElementById('paymentForm').addEventListener('submit', handlePaymentSubmit);

    // Card element errors
    cardElement.addEventListener('change', (event) => {
        const errorElement = document.getElementById('cardErrors');
        if (event.error) {
            errorElement.textContent = event.error.message;
        } else {
            errorElement.textContent = '';
        }
    });
}

function switchTab(selectedTab) {
    // Update tab styles
    document.querySelectorAll('.option-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    selectedTab.classList.add('active');

    // Switch forms
    const option = selectedTab.dataset.option;
    document.querySelectorAll('.access-form').forEach(form => {
        form.classList.remove('active');
    });

    if (option === 'coupon') {
        document.getElementById('couponForm').classList.add('active');
    } else {
        document.getElementById('paymentForm').classList.add('active');
    }
}

async function handleCouponSubmit(event) {
    event.preventDefault();

    const email = document.getElementById('couponEmail').value;
    const code = document.getElementById('couponCode').value.toUpperCase();

    showLoading(true);

    try {
        // Check coupon in Firebase Realtime Database
        const couponRef = database.ref(`coupons/${code}`);
        const snapshot = await couponRef.once('value');
        const couponData = snapshot.val();

        if (couponData && couponData.active) {
            // Check if coupon has uses remaining
            if (couponData.maxUses && couponData.usedCount >= couponData.maxUses) {
                showError('Este código ha alcanzado el límite de usos.');
                showLoading(false);
                return;
            }

            // Store access credentials
            localStorage.setItem('lck_access_granted', 'true');
            localStorage.setItem('lck_user_email', email);
            localStorage.setItem('lck_access_type', 'coupon');
            localStorage.setItem('lck_coupon_used', code);

            // Log usage in Firebase
            const usageRef = database.ref('coupon_usage').push();
            await usageRef.set({
                code: code,
                email: email,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });

            // Update used count
            if (couponData.maxUses) {
                await couponRef.update({
                    usedCount: (couponData.usedCount || 0) + 1
                });
            }

            // Track event
            analytics.logEvent('coupon_redeemed', {
                coupon_code: code,
                email: email
            });

            showSuccessModal();
        } else {
            showError('Código inválido o expirado. Por favor, verifica e intenta nuevamente.');
        }
    } catch (error) {
        console.error('Error validating coupon:', error);
        showError('Error al validar el código. Por favor, intenta más tarde.');
    } finally {
        showLoading(false);
    }
}

async function handlePaymentSubmit(event) {
    event.preventDefault();

    const email = document.getElementById('paymentEmail').value;

    // Store email for later verification
    sessionStorage.setItem('pending_email', email);

    // Track payment initiation
    analytics.logEvent('payment_initiated', {
        email: email
    });

    // Create a payment session ID
    const sessionId = Date.now().toString();
    sessionStorage.setItem('payment_session', sessionId);

    // Redirect to Stripe Payment Link with email and session metadata
    const paymentUrl = `${STRIPE_PAYMENT_LINK}?prefilled_email=${encodeURIComponent(email)}&client_reference_id=${sessionId}`;

    // Open in new tab or redirect
    window.open(paymentUrl, '_blank');

    // Show instructions modal
    showPaymentInstructionsModal();
}

// Check if returning from payment
function checkReturnFromPayment() {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const sessionId = urlParams.get('session_id');

    if (success === 'true') {
        const email = sessionStorage.getItem('pending_email');
        if (email) {
            // Grant access after successful payment
            localStorage.setItem('lck_access_granted', 'true');
            localStorage.setItem('lck_user_email', email);
            localStorage.setItem('lck_access_type', 'paid');
            localStorage.setItem('lck_payment_session', sessionId || '');

            // Log successful payment
            analytics.logEvent('purchase', {
                currency: 'MXN',
                value: 1499,
                email: email
            });

            // Clear session storage
            sessionStorage.removeItem('pending_email');
            sessionStorage.removeItem('payment_session');

            // Show success modal
            showSuccessModal();

            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
}

function showSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.classList.add('active');

    // Auto redirect after 3 seconds
    setTimeout(() => {
        window.location.href = 'conference.html';
    }, 3000);
}

function showPaymentInstructionsModal() {
    // Create instruction modal
    const modalHtml = `
        <div id="paymentInstructionsModal" class="modal active">
            <div class="modal-content">
                <div class="instruction-icon">💳</div>
                <h3>Completa tu Pago</h3>
                <p>Se ha abierto una nueva ventana para completar tu pago de forma segura con Stripe.</p>
                <p style="margin-top: 15px; font-size: 0.9em; color: var(--text-light);">Después de completar el pago, recibirás un correo con tu código de acceso.</p>
                <button class="modal-btn" onclick="closePaymentModal()">Entendido</button>
            </div>
        </div>
    `;

    // Add modal to page if it doesn't exist
    if (!document.getElementById('paymentInstructionsModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    } else {
        document.getElementById('paymentInstructionsModal').classList.add('active');
    }
}

function closePaymentModal() {
    const modal = document.getElementById('paymentInstructionsModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function showError(message) {
    // Create error notification
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #e74c3c;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 3000;
        animation: slideInRight 0.3s ease;
    `;

    document.body.appendChild(errorDiv);

    // Remove after 5 seconds
    setTimeout(() => {
        errorDiv.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => errorDiv.remove(), 300);
    }, 5000);
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);