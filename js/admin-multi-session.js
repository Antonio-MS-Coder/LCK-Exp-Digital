// Admin Multi-Session Support - LCK Experience Digital
// Allows multiple admins to be signed in simultaneously

// Initialize Firebase Auth with LOCAL persistence
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
        console.log('Admin auth persistence set to LOCAL');
    })
    .catch((error) => {
        console.error('Error setting persistence:', error);
    });

// Admin login handler - doesn't interfere with other sessions
async function handleAdminLogin(event) {
    event.preventDefault();
    console.log('HandleAdminLogin called');

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btnText = document.getElementById('loginBtnText');
    const loader = document.getElementById('loginLoader');
    const errorDiv = document.getElementById('loginError');

    console.log('Attempting login for:', email);
    btnText.textContent = 'Verificando...';
    loader.classList.remove('d-none');
    errorDiv.classList.add('d-none');

    try {
        // Sign in with Firebase Auth
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        console.log('Sign in successful for:', userCredential.user.email);

        // Check if user is admin
        const isAdmin = await verifyAdminAccess(userCredential.user.email);
        console.log('Admin status:', isAdmin);

        if (isAdmin) {
            // Store admin session
            storeAdminSession(userCredential.user);
            console.log('Admin session stored, redirecting to admin.html...');

            // Force redirect immediately
            window.location.replace('/admin.html');
        } else {
            // Don't sign out - just show error
            showAdminError('No tienes permisos de administrador. Contacta al super admin.');
            // Don't sign out to avoid affecting other sessions
        }

    } catch (error) {
        console.error('Login error:', error);
        handleLoginError(error, errorDiv);
    } finally {
        btnText.textContent = 'Iniciar Sesión';
        loader.classList.add('d-none');
    }
}

// Google Sign-In for admin - improved
async function signInWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();

        // Allow account selection
        provider.setCustomParameters({
            prompt: 'select_account'
        });

        // Add additional scopes if needed
        provider.addScope('email');
        provider.addScope('profile');

        console.log('Opening Google sign-in popup...');
        const result = await firebase.auth().signInWithPopup(provider);

        console.log('Google sign in successful:', result.user.email);

        // Check if admin
        const isAdmin = await verifyAdminAccess(result.user.email);

        if (isAdmin) {
            // Store admin session
            storeAdminSession(result.user);
            console.log('Admin access granted via Google, redirecting...');
            window.location.replace(window.location.origin + '/admin.html');
        } else {
            // Don't sign out - just show error and offer options
            showNonAdminOptions(result.user);
        }

    } catch (error) {
        console.error('Google sign in error:', error);

        if (error.code === 'auth/popup-closed-by-user') {
            console.log('User cancelled Google sign in');
        } else if (error.code === 'auth/popup-blocked') {
            console.log('Popup blocked, trying redirect method...');
            // Try redirect method as fallback
            try {
                const provider = new firebase.auth.GoogleAuthProvider();
                provider.setCustomParameters({
                    prompt: 'select_account'
                });
                await firebase.auth().signInWithRedirect(provider);
            } catch (redirectError) {
                console.error('Redirect sign in also failed:', redirectError);
                alert('Error al iniciar sesión. Por favor, permite popups o intenta con email/contraseña.');
            }
        } else if (error.code === 'auth/cancelled-popup-request') {
            console.log('Another popup was already open');
        } else {
            alert('Error al iniciar sesión con Google: ' + error.message);
        }
    }
}

// Verify admin access without affecting session
async function verifyAdminAccess(email) {
    if (!email) {
        console.log('No email provided for admin verification');
        return false;
    }

    console.log('Verifying admin access for:', email);

    try {
        const database = firebase.database();
        const emailKey = email.replace(/\./g, '_');
        console.log('Checking with key:', emailKey);

        // Check admins collection
        const adminRef = database.ref(`admins/${emailKey}`);
        const adminSnapshot = await adminRef.once('value');
        const adminData = adminSnapshot.val();
        console.log('Admin data from admins collection:', adminData);

        if (adminData && adminData.active) {
            console.log('✓ Admin verified in admins collection');
            return true;
        }

        // Check users collection for admin role
        const userRef = database.ref(`users/${emailKey}`);
        const userSnapshot = await userRef.once('value');
        const userData = userSnapshot.val();
        console.log('User data from users collection:', userData);

        if (userData && (userData.role === 'admin' || userData.role === 'super_admin')) {
            console.log('✓ Admin verified via role:', userData.role);
            return true;
        }

        console.log('✗ User is not an admin:', email);
        return false;

    } catch (error) {
        console.error('Error verifying admin access:', error);
        return false;
    }
}

// Store admin session data
function storeAdminSession(user) {
    sessionStorage.setItem('adminEmail', user.email);
    sessionStorage.setItem('adminUid', user.uid);
    sessionStorage.setItem('adminAuthenticated', 'true');
    sessionStorage.setItem('adminSignInTime', Date.now().toString());

    // Also store in localStorage for persistence
    localStorage.setItem('lastAdminEmail', user.email);
    localStorage.setItem('lastAdminSignIn', Date.now().toString());
}

// Show error for non-admin users
function showAdminError(message) {
    const errorDiv = document.getElementById('loginError');
    const errorText = document.getElementById('loginErrorText');

    if (errorDiv && errorText) {
        errorText.textContent = message;
        errorDiv.classList.remove('d-none');
    } else {
        alert(message);
    }
}

// Show options for non-admin users
function showNonAdminOptions(user) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;

    modal.innerHTML = `
        <div style="
            background: white;
            padding: 30px;
            border-radius: 10px;
            max-width: 400px;
            text-align: center;
        ">
            <h2 style="color: #d32f2f; margin-bottom: 15px;">
                Acceso Denegado
            </h2>
            <p style="margin-bottom: 10px;">
                <strong>${user.email}</strong>
            </p>
            <p style="margin-bottom: 20px;">
                No tienes permisos de administrador.
            </p>
            <p style="margin-bottom: 20px; font-size: 14px; color: #666;">
                Si crees que esto es un error, contacta al administrador principal.
            </p>
            <button onclick="this.closest('div').parentElement.remove()" style="
                background: var(--accent-gold);
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                margin-right: 10px;
            ">Entendido</button>
            <button onclick="switchAccount()" style="
                background: #f5f5f5;
                color: #333;
                border: 1px solid #ddd;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
            ">Cambiar Cuenta</button>
        </div>
    `;

    document.body.appendChild(modal);
}

// Switch to different account
window.switchAccount = async function() {
    try {
        // Sign out current user
        await firebase.auth().signOut();

        // Clear session
        sessionStorage.clear();

        // Remove modal
        const modal = document.querySelector('div[style*="position: fixed"]');
        if (modal) modal.remove();

        // Try Google sign in again
        setTimeout(() => {
            signInWithGoogle();
        }, 500);

    } catch (error) {
        console.error('Error switching account:', error);
    }
}

// Handle login errors
function handleLoginError(error, errorDiv) {
    const errorText = document.getElementById('loginErrorText');

    let message = '';

    switch(error.code) {
        case 'auth/user-not-found':
            message = 'Usuario no encontrado';
            break;
        case 'auth/wrong-password':
            message = 'Contraseña incorrecta';
            break;
        case 'auth/invalid-email':
            message = 'Correo electrónico inválido';
            break;
        case 'auth/too-many-requests':
            message = 'Demasiados intentos. Por favor, espera un momento.';
            break;
        default:
            message = error.message || 'Error al iniciar sesión';
    }

    if (errorText) {
        errorText.textContent = message;
        errorDiv.classList.remove('d-none');
    } else {
        alert(message);
    }
}

// Check if user is already logged in as admin
async function checkExistingAdminSession() {
    const auth = firebase.auth();

    // First check for redirect result (in case we came from a redirect sign-in)
    try {
        const result = await auth.getRedirectResult();
        if (result.user) {
            console.log('Got redirect result for:', result.user.email);
            const isAdmin = await verifyAdminAccess(result.user.email);
            if (isAdmin) {
                storeAdminSession(result.user);
                window.location.replace('/admin.html');
                return true;
            } else {
                showNonAdminOptions(result.user);
                return false;
            }
        }
    } catch (error) {
        console.log('No redirect result or error getting it:', error);
    }

    // Wait for auth to be ready and check just once
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            // Unsubscribe immediately to prevent multiple calls
            unsubscribe();

            if (user && window.location.pathname.includes('admin-login')) {
                console.log('Found existing user:', user.email);

                // Check if we're already redirecting to prevent loops
                if (sessionStorage.getItem('adminRedirecting')) {
                    console.log('Already redirecting, skipping...');
                    resolve(false);
                    return;
                }

                const isAdmin = await verifyAdminAccess(user.email);

                if (isAdmin) {
                    console.log('Existing admin session valid, redirecting...');
                    sessionStorage.setItem('adminRedirecting', 'true');
                    storeAdminSession(user);
                    window.location.replace('/admin.html');
                    resolve(true);
                } else {
                    console.log('User is not admin');
                    resolve(false);
                }
            } else {
                resolve(false);
            }
        });

        // Increase timeout to 10 seconds for slow connections
        setTimeout(() => {
            console.log('Auth check timeout after 10 seconds');
            unsubscribe();
            resolve(false);
        }, 10000);
    });
}

// Initialize on admin login page
if (window.location.pathname.includes('admin-login')) {
    document.addEventListener('DOMContentLoaded', () => {
        checkExistingAdminSession();

        // Attach event handlers
        const form = document.getElementById('adminLoginForm');
        if (form) {
            form.onsubmit = handleAdminLogin;
        }

        // Make functions globally available
        window.signInWithGoogle = signInWithGoogle;
        window.handleAdminLogin = handleAdminLogin;
    });
}

// Export for use in other files
window.AdminMultiSession = {
    verifyAdminAccess,
    storeAdminSession,
    checkExistingAdminSession,
    signInWithGoogle,
    handleAdminLogin
};