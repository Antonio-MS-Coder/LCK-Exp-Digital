// LCK Experience Digital - Auth First Flow
// Users must authenticate before purchasing or using coupons

// Initialize Firebase services
const auth = firebase.auth();
const database = firebase.database();
let currentUser = null;
let userAccessStatus = null;

// Prevent duplicate auth listeners and ensure DOM is ready
if (!window.authFlowInitialized) {
    window.authFlowInitialized = true;

    // Ensure DOM is ready before setting up auth listener
    const initializeAuth = () => {
        console.log('Initializing auth flow...');

        // Check auth state on page load
        auth.onAuthStateChanged(async (user) => {
    currentUser = user;

    if (user) {
        console.log('User authenticated:', user.email);

        // Check if we're on index page
        const isIndexPage = window.location.pathname === '/' ||
                          window.location.pathname === '/index.html' ||
                          window.location.pathname.endsWith('/index.html') ||
                          window.location.pathname === '/index';

        // Only show user info and check access on index page
        if (isIndexPage) {
            // Update UI to show user info
            const userInfo = document.getElementById('userInfo');
            const userEmail = document.getElementById('userEmail');
            if (userInfo) userInfo.classList.remove('d-none');
            if (userEmail) userEmail.textContent = user.email;

            // Clear any redirect flag to prevent loops
            sessionStorage.removeItem('redirecting');

            // Check if user has access and wait for result
            console.log('Starting access check for user:', user.email);
            try {
                const hasAccess = await checkUserAccess(user.email);
                console.log('Access check completed. Has access:', hasAccess, 'Status:', userAccessStatus);

                // Only redirect if user HAS access (not if they don't)
                if (hasAccess) {
                    // Only redirect if not already redirecting (prevent loops)
                    if (!sessionStorage.getItem('redirecting')) {
                        console.log('User has access, redirecting to conferences...');
                        sessionStorage.setItem('redirecting', 'true');
                        window.location.href = '/conferences.html';
                        return;
                    }
                } else {
                    // User is authenticated but has NO access - show payment/coupon options
                    console.log('User authenticated but no access - showing payment options');
                }

                // Update content based on access status (after access check completes)
                updateContentForAuthenticatedUser();
            } catch (error) {
                console.error('Error during access check:', error);
                // On error, show payment options (safe fallback)
                userAccessStatus = 'error';
                updateContentForAuthenticatedUser();
            }
        } else {
            // Not on index page, clear redirect flag
            sessionStorage.removeItem('redirecting');
        }

    } else {
        console.log('No user authenticated');

        // Hide user info safely
        const userInfo = document.getElementById('userInfo');
        if (userInfo) userInfo.classList.add('d-none');

        // Show non-authenticated content
        updateContentForNonAuthenticatedUser();
    }
        });
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAuth);
    } else {
        // DOM is already ready
        initializeAuth();
    }
}

// Check if user has access in database
async function checkUserAccess(email) {
    if (!email) {
        console.error('No email provided to checkUserAccess');
        userAccessStatus = 'error';
        return false;
    }

    try {
        console.log('Checking access for email:', email);

        // Ensure database is available
        if (!database) {
            throw new Error('Firebase database not initialized');
        }

        const userRef = database.ref(`users/${email.replace(/\./g, '_')}`);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val();

        console.log('User data from database:', userData);

        // Check multiple access conditions (same as conference-gallery.js)
        const hasAccess = userData && (
            userData.accessGranted === true ||  // General access
            userData.hasPaid === true ||        // Has paid through Stripe
            userData.accessType === 'coupon' || // Has coupon access
            userData.accessType === 'paid' ||   // Marked as paid
            userData.accessType === 'admin'     // Admin granted access
        );

        userAccessStatus = hasAccess ? 'granted' : 'none';

        console.log('Access check result for', email, ':', hasAccess, 'Access conditions met:', {
            accessGranted: userData?.accessGranted,
            hasPaid: userData?.hasPaid,
            accessType: userData?.accessType
        });

        return hasAccess;
    } catch (error) {
        console.error('Error checking access for', email, ':', error);
        userAccessStatus = 'error';
        return false;
    }
}

// Update content for authenticated users
function updateContentForAuthenticatedUser() {
    console.log('Updating content for authenticated user, access status:', userAccessStatus);

    // Hide non-auth content safely
    const nonAuthContent = document.getElementById('nonAuthContent');
    if (nonAuthContent) nonAuthContent.classList.add('d-none');

    const authNoAccessContent = document.getElementById('authNoAccessContent');
    const authWithAccessContent = document.getElementById('authWithAccessContent');

    if (userAccessStatus === 'granted') {
        // User has access - show conference button
        console.log('User has access - showing conference access content');
        if (authNoAccessContent) authNoAccessContent.classList.add('d-none');
        if (authWithAccessContent) authWithAccessContent.classList.remove('d-none');
    } else {
        // User needs to purchase or use coupon (including 'error' and null states)
        console.log('User needs access - showing payment/coupon options');
        if (authNoAccessContent) authNoAccessContent.classList.remove('d-none');
        if (authWithAccessContent) authWithAccessContent.classList.add('d-none');
    }
}

// Update content for non-authenticated users
function updateContentForNonAuthenticatedUser() {
    console.log('Updating content for non-authenticated user');

    // Show non-auth content safely
    const nonAuthContent = document.getElementById('nonAuthContent');
    if (nonAuthContent) nonAuthContent.classList.remove('d-none');

    // Hide auth-specific content safely
    const authNoAccessContent = document.getElementById('authNoAccessContent');
    const authWithAccessContent = document.getElementById('authWithAccessContent');
    if (authNoAccessContent) authNoAccessContent.classList.add('d-none');
    if (authWithAccessContent) authWithAccessContent.classList.add('d-none');
}

// Show auth modal
function showAuthModal(tab = 'login') {
    document.getElementById('authModal').classList.add('active');
    switchAuthTab(tab);
}

// Switch auth tabs
function switchAuthTab(tab) {
    if (tab === 'login') {
        document.getElementById('loginTab').classList.add('active');
        document.getElementById('registerTab').classList.remove('active');
        document.getElementById('loginForm').classList.remove('d-none');
        document.getElementById('registerForm').classList.add('d-none');
    } else {
        document.getElementById('registerTab').classList.add('active');
        document.getElementById('loginTab').classList.remove('active');
        document.getElementById('registerForm').classList.remove('d-none');
        document.getElementById('loginForm').classList.add('d-none');
    }
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    const btnText = document.getElementById('loginBtnText');
    const loader = document.getElementById('loginLoader');
    const errorDiv = document.getElementById('loginError');

    btnText.textContent = 'Iniciando sesión...';
    loader.classList.remove('d-none');
    errorDiv.classList.add('d-none');

    try {
        // Sign in with Firebase Auth
        await auth.signInWithEmailAndPassword(email, password);

        // Check if user has access
        const hasAccess = await checkUserAccess(email);

        // Success - close modal
        closeModal('authModal');

        // Redirect based on access
        if (hasAccess) {
            window.location.href = 'conferences.html';
        }

    } catch (error) {
        console.error('Login error:', error);

        const errorText = document.getElementById('loginErrorText');

        if (error.code === 'auth/user-not-found') {
            errorText.textContent = 'No existe una cuenta con este correo. Por favor crea una cuenta primero.';
        } else if (error.code === 'auth/wrong-password') {
            errorText.textContent = 'Contraseña incorrecta. Por favor intenta de nuevo.';
        } else if (error.code === 'auth/invalid-email') {
            errorText.textContent = 'Correo electrónico inválido.';
        } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-login-credentials') {
            errorText.textContent = 'Credenciales inválidas. Por favor verifica tu email y contraseña.';
        } else {
            errorText.textContent = error.message || 'Error al iniciar sesión.';
        }

        errorDiv.classList.remove('d-none');
    } finally {
        btnText.textContent = 'Iniciar Sesión';
        loader.classList.add('d-none');
    }
}

// Handle registration
async function handleRegister(event) {
    event.preventDefault();

    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;

    const btnText = document.getElementById('registerBtnText');
    const loader = document.getElementById('registerLoader');
    const errorDiv = document.getElementById('registerError');

    if (password.length < 6) {
        const errorText = document.getElementById('registerErrorText');
        errorText.textContent = 'La contraseña debe tener al menos 6 caracteres.';
        errorDiv.classList.remove('d-none');
        return;
    }

    btnText.textContent = 'Creando cuenta...';
    loader.classList.remove('d-none');
    errorDiv.classList.add('d-none');

    try {
        // Create user with Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Update display name
        await user.updateProfile({
            displayName: name
        });

        // Create user record in database (without access yet)
        const userRef = database.ref(`users/${email.replace(/\./g, '_')}`);
        await userRef.set({
            name: name,
            email: email,
            uid: user.uid,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            accessGranted: false,
            accessType: null
        });

        // Send verification email
        await user.sendEmailVerification();

        // Success - close modal
        alert('¡Cuenta creada exitosamente! Revisa tu email para verificar tu cuenta.');
        closeModal('authModal');

    } catch (error) {
        console.error('Registration error:', error);

        const errorText = document.getElementById('registerErrorText');

        if (error.code === 'auth/email-already-in-use') {
            errorText.textContent = 'Este correo ya está registrado. Por favor inicia sesión.';
        } else if (error.code === 'auth/invalid-email') {
            errorText.textContent = 'Correo electrónico inválido.';
        } else if (error.code === 'auth/weak-password') {
            errorText.textContent = 'La contraseña es muy débil. Usa al menos 6 caracteres.';
        } else {
            errorText.textContent = error.message || 'Error al crear la cuenta.';
        }

        errorDiv.classList.remove('d-none');
    } finally {
        btnText.textContent = 'Crear Cuenta';
        loader.classList.add('d-none');
    }
}

// Handle coupon (for authenticated users only)
async function handleCoupon(event) {
    event.preventDefault();

    if (!currentUser) {
        alert('Debes iniciar sesión primero.');
        showAuthModal('login');
        return;
    }

    const code = document.getElementById('couponCode').value.toUpperCase().trim();
    const email = currentUser.email;

    const btnText = document.getElementById('couponBtnText');
    const loader = document.getElementById('couponLoader');
    const errorDiv = document.getElementById('couponError');
    const successDiv = document.getElementById('couponSuccess');

    btnText.textContent = 'Validando...';
    loader.classList.remove('d-none');
    errorDiv.classList.add('d-none');
    successDiv.classList.add('d-none');

    try {
        // Check coupon in database
        const couponRef = database.ref(`coupons/${code}`);
        const snapshot = await couponRef.once('value');
        const couponData = snapshot.val();

        if (!couponData || !couponData.active) {
            throw new Error('Código inválido o expirado');
        }

        if (couponData.maxUses && couponData.usedCount >= couponData.maxUses) {
            throw new Error('Este código ha alcanzado el límite de usos');
        }

        // Update coupon usage
        await couponRef.update({
            usedCount: (couponData.usedCount || 0) + 1,
            lastUsedAt: firebase.database.ServerValue.TIMESTAMP,
            lastUsedBy: email
        });

        // Grant access to user
        const userRef = database.ref(`users/${email.replace(/\./g, '_')}`);
        await userRef.update({
            accessGranted: true,
            accessType: 'coupon',
            couponCode: code,
            grantedAt: firebase.database.ServerValue.TIMESTAMP
        });

        // Update local access status
        userAccessStatus = 'granted';

        // Show success
        const successText = document.getElementById('couponSuccessText');
        successText.textContent = '¡Cupón validado exitosamente! Redirigiendo a las conferencias...';
        successDiv.classList.remove('d-none');

        // Update UI and redirect
        setTimeout(() => {
            closeModal('couponModal');
            updateContentForAuthenticatedUser();
            goToConferences();
        }, 2000);

    } catch (error) {
        const errorText = document.getElementById('couponErrorText');
        errorText.textContent = error.message || 'Error al validar el cupón';
        errorDiv.classList.remove('d-none');
    } finally {
        btnText.textContent = 'Validar Cupón';
        loader.classList.add('d-none');
    }
}

// Handle payment (for authenticated users only)
async function proceedToPayment(event) {
    if (!currentUser) {
        alert('Debes iniciar sesión primero.');
        showAuthModal('login');
        return;
    }

    const email = currentUser.email;
    const userId = currentUser.uid;

    // Show loading
    const payButton = event ? event.target : document.querySelector('.btn-primary');
    const originalText = payButton.textContent;
    payButton.textContent = 'Verificando...';
    payButton.disabled = true;

    try {
        // First check if user already paid or has coupon access
        if (window.StripeIntegration) {
            const accessStatus = await StripeIntegration.validateAccess(email);

            if (accessStatus.hasAccess) {
                if (accessStatus.accessType === 'coupon') {
                    alert('¡Ya tienes acceso con cupón! No necesitas pagar. Redirigiendo...');
                } else if (accessStatus.hasPaid) {
                    alert('¡Ya has realizado el pago anteriormente! Redirigiendo...');
                }
                setTimeout(() => {
                    window.location.href = '/conferences.html';
                }, 2000);
                payButton.textContent = originalText;
                payButton.disabled = false;
                return;
            }
        }

        // Use direct Stripe Payment Link (más confiable)
        const sessionId = `lck_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

        // Store session for return
        sessionStorage.setItem('pending_email', email);
        sessionStorage.setItem('payment_session', sessionId);
        sessionStorage.setItem('pending_uid', userId);

        // Redirect to Stripe Payment Link
        let paymentUrl = STRIPE_PAYMENT_LINK;
        paymentUrl += `?prefilled_email=${encodeURIComponent(email)}`;
        paymentUrl += `&client_reference_id=${sessionId}`;

        console.log('Redirecting to Stripe:', paymentUrl);
        window.location.href = paymentUrl;

    } catch (error) {
        console.error('Payment error:', error);

        // Fallback directo al payment link si hay cualquier error
        const paymentUrl = STRIPE_PAYMENT_LINK + `?prefilled_email=${encodeURIComponent(email)}`;
        console.log('Using fallback payment link:', paymentUrl);
        window.location.href = paymentUrl;
    }
}

// Check for payment return
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');

    if (success === 'true' && currentUser) {
        const email = sessionStorage.getItem('pending_email');

        if (email === currentUser.email) {
            // Grant access after successful payment
            const userRef = database.ref(`users/${email.replace(/\./g, '_')}`);
            userRef.update({
                accessGranted: true,
                accessType: 'paid',
                paidAt: firebase.database.ServerValue.TIMESTAMP
            }).then(() => {
                sessionStorage.clear();
                window.history.replaceState({}, document.title, window.location.pathname);

                alert('¡Pago exitoso! Ya tienes acceso a todas las conferencias.');

                // Update status and redirect
                userAccessStatus = 'granted';
                updateContentForAuthenticatedUser();

                setTimeout(() => {
                    goToConferences();
                }, 2000);
            });
        }
    }
});

// Handle Google Sign In
async function signInWithGoogle() {
    try {
        // Create Google provider
        const provider = new firebase.auth.GoogleAuthProvider();

        // Add scopes if needed
        provider.addScope('email');
        provider.addScope('profile');

        // Sign in with popup
        const result = await auth.signInWithPopup(provider);
        const user = result.user;

        // Check if this is a new user
        const isNewUser = result.additionalUserInfo.isNewUser;

        if (isNewUser) {
            // Create user record in database for new Google users
            const userRef = database.ref(`users/${user.email.replace(/\./g, '_')}`);
            await userRef.set({
                name: user.displayName || 'Usuario de Google',
                email: user.email,
                uid: user.uid,
                photoURL: user.photoURL || null,
                authProvider: 'google',
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                accessGranted: false,
                accessType: null
            });

            alert(`¡Bienvenido ${user.displayName}! Tu cuenta ha sido creada exitosamente.`);
        } else {
            // Check if existing user has record in database
            const userRef = database.ref(`users/${user.email.replace(/\./g, '_')}`);
            const snapshot = await userRef.once('value');

            if (!snapshot.exists()) {
                // Create record for existing Google user who doesn't have DB record
                await userRef.set({
                    name: user.displayName || 'Usuario de Google',
                    email: user.email,
                    uid: user.uid,
                    photoURL: user.photoURL || null,
                    authProvider: 'google',
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    accessGranted: false,
                    accessType: null
                });
            }
        }

        // Close modal if open
        closeModal('authModal');

        // Auth state change will handle the rest

    } catch (error) {
        console.error('Google sign in error:', error);

        let errorMessage = 'Error al iniciar sesión con Google.';

        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'Inicio de sesión cancelado.';
        } else if (error.code === 'auth/popup-blocked') {
            errorMessage = 'El navegador bloqueó la ventana de Google. Por favor permite las ventanas emergentes.';
        } else if (error.code === 'auth/cancelled-popup-request') {
            errorMessage = 'Solicitud cancelada. Por favor intenta de nuevo.';
        }

        alert(errorMessage);
    }
}

// Handle forgot password
async function handleForgotPassword(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();

    if (!email) {
        alert('Por favor ingresa tu correo electrónico primero.');
        document.getElementById('loginEmail').focus();
        return;
    }

    try {
        await auth.sendPasswordResetEmail(email);
        alert(`Se ha enviado un link de recuperación a ${email}. Revisa tu bandeja de entrada.`);
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            alert('No existe una cuenta con este correo. Por favor crea una cuenta primero.');
        } else {
            alert('Error al enviar el email. Por favor intenta de nuevo.');
        }
    }
}

// Show coupon modal
function showCouponModal() {
    if (!currentUser) {
        alert('Debes iniciar sesión primero.');
        showAuthModal('login');
        return;
    }

    document.getElementById('couponModal').classList.add('active');
}

// Go to conferences
function goToConferences() {
    window.location.href = 'conferences.html';
}

// Sign out
async function signOut() {
    try {
        await auth.signOut();
        alert('Sesión cerrada exitosamente.');
        window.location.reload();
    } catch (error) {
        console.error('Error signing out:', error);
        alert('Error al cerrar sesión.');
    }
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');

    // Clear form errors
    const errorDivs = document.querySelectorAll(`#${modalId} .alert-error`);
    errorDivs.forEach(div => div.classList.add('d-none'));

    // Clear form inputs
    const inputs = document.querySelectorAll(`#${modalId} input`);
    inputs.forEach(input => input.value = '');
}

// Modal closing on background click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closeModal(e.target.id);
    }
});

// Escape key to close modals
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal.active');
        modals.forEach(modal => {
            closeModal(modal.id);
        });
    }
});