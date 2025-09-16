// Admin Authentication Management - LCK Experience Digital

// Set Firebase persistence to LOCAL (persists until explicitly signed out)
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
        console.log('Persistence set to LOCAL');
    })
    .catch((error) => {
        console.error('Error setting persistence:', error);
    });

const auth = firebase.auth();
const database = firebase.database();

let isCheckingAuth = false;
let authCheckTimeout = null;
let authInitialized = false;
let lastAuthCheck = 0;

// Global function to check admin status
async function checkAdminStatus(email) {
    try {
        // Check in admins collection first
        const adminRef = database.ref(`admins/${email.replace(/\./g, '_')}`);
        const adminSnapshot = await adminRef.once('value');
        const adminData = adminSnapshot.val();

        if (adminData && adminData.active) {
            // Store admin status in session
            sessionStorage.setItem('isAdmin', 'true');
            sessionStorage.setItem('adminRole', adminData.role || 'admin');
            return true;
        }

        // Check in users collection for admin role
        const userRef = database.ref(`users/${email.replace(/\./g, '_')}`);
        const userSnapshot = await userRef.once('value');
        const userData = userSnapshot.val();

        const isAdmin = userData && (userData.role === 'admin' || userData.role === 'super_admin');

        if (isAdmin) {
            sessionStorage.setItem('isAdmin', 'true');
            sessionStorage.setItem('adminRole', userData.role);
        }

        return isAdmin;

    } catch (error) {
        console.error('Error checking admin status:', error);

        // Check session storage as fallback
        const cachedStatus = sessionStorage.getItem('isAdmin');
        return cachedStatus === 'true';
    }
}

// Handle authentication state for admin pages
function initAdminAuth(redirectOnFail = true) {
    return new Promise((resolve, reject) => {
        // If already initialized and authenticated recently, resolve immediately
        if (authInitialized && auth.currentUser) {
            const now = Date.now();
            if (now - lastAuthCheck < 60000) { // Check if last auth was within 1 minute
                console.log('Using cached auth state');
                resolve(true);
                return;
            }
        }

        // Clear any existing timeout
        if (authCheckTimeout) {
            clearTimeout(authCheckTimeout);
        }

        // Set a longer timeout (30 seconds instead of 5)
        authCheckTimeout = setTimeout(() => {
            // Don't redirect on timeout if user is already authenticated
            if (auth.currentUser) {
                console.log('Timeout but user is authenticated');
                resolve(true);
            } else if (redirectOnFail) {
                console.log('Auth check timeout - redirecting to login');
                window.location.href = '/admin-login.html';
                reject(new Error('Auth check timeout'));
            } else {
                reject(new Error('Auth check timeout'));
            }
        }, 30000);

        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            // Clear timeout since we got a response
            if (authCheckTimeout) {
                clearTimeout(authCheckTimeout);
                authCheckTimeout = null;
            }

            if (isCheckingAuth) return;
            isCheckingAuth = true;

            try {
                if (!user) {
                    console.log('No user authenticated');
                    sessionStorage.clear();

                    if (redirectOnFail) {
                        window.location.href = '/admin-login.html';
                    }
                    resolve(false);
                    return;
                }

                console.log('User authenticated:', user.email);

                // Check if user is admin
                const isAdmin = await checkAdminStatus(user.email);

                if (!isAdmin) {
                    console.log('User is not admin');

                    if (redirectOnFail) {
                        alert('No tienes permisos de administrador');
                        await auth.signOut();
                        sessionStorage.clear();
                        window.location.href = '/admin-login.html';
                    }
                    resolve(false);
                } else {
                    console.log('Admin access granted');

                    // Update UI if elements exist
                    const emailElement = document.getElementById('adminEmail');
                    if (emailElement) {
                        emailElement.textContent = user.email;
                    }

                    // Store auth state
                    sessionStorage.setItem('adminEmail', user.email);
                    authInitialized = true;
                    lastAuthCheck = Date.now();

                    resolve(true);
                }
            } catch (error) {
                console.error('Error in auth check:', error);

                if (redirectOnFail) {
                    window.location.href = '/admin-login.html';
                }
                resolve(false);
            } finally {
                isCheckingAuth = false;
                unsubscribe(); // Stop listening after first check
            }
        });
    });
}

// Sign out function
async function signOut() {
    try {
        await auth.signOut();
        sessionStorage.clear();
        localStorage.removeItem('adminEmail');
        window.location.href = '/admin-login.html';
    } catch (error) {
        console.error('Error signing out:', error);
        alert('Error al cerrar sesión');
    }
}

// Keep session alive
function keepSessionAlive() {
    // Refresh token every 10 minutes (more frequent)
    setInterval(async () => {
        if (auth.currentUser) {
            try {
                await auth.currentUser.getIdToken(true);
                lastAuthCheck = Date.now();
                console.log('Session refreshed at', new Date().toLocaleTimeString());

                // Also verify admin status silently
                const isStillAdmin = await checkAdminStatus(auth.currentUser.email);
                if (!isStillAdmin) {
                    console.warn('Admin status lost');
                    await signOut();
                }
            } catch (error) {
                console.error('Error refreshing session:', error);
                // If refresh fails, try to re-authenticate silently
                if (error.code === 'auth/user-token-expired') {
                    console.log('Token expired, attempting silent re-auth');
                    try {
                        await auth.currentUser.reload();
                    } catch (reloadError) {
                        console.error('Failed to reload user:', reloadError);
                    }
                }
            }
        }
    }, 10 * 60 * 1000); // 10 minutes

    // Also add a more frequent lightweight check
    setInterval(() => {
        if (auth.currentUser) {
            lastAuthCheck = Date.now();
        }
    }, 60 * 1000); // Every minute
}

// Initialize session keeper
if (window.location.pathname.includes('admin')) {
    keepSessionAlive();
}

// Export functions
window.adminAuth = {
    initAdminAuth,
    checkAdminStatus,
    signOut,
    keepSessionAlive
};