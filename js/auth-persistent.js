// Persistent Authentication System - LCK Experience Digital
// This ensures users stay signed in across all pages

// Initialize Firebase Auth with LOCAL persistence
if (typeof firebase !== 'undefined' && firebase.auth) {
    // Set persistence to LOCAL - this is the most persistent option
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .then(() => {
            console.log('Auth persistence set to LOCAL - users will stay signed in');
        })
        .catch((error) => {
            console.error('Error setting persistence:', error);
        });
}

// Global auth state manager
const AuthManager = {
    currentUser: null,
    isInitialized: false,
    authStateCallbacks: [],
    lastActivityTime: Date.now(),
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours

    // Initialize auth monitoring
    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        const auth = firebase.auth();

        // Monitor auth state changes
        auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            this.lastActivityTime = Date.now();

            if (user) {
                console.log('User authenticated:', user.email);
                this.setupSessionKeepAlive();

                // Store auth state
                sessionStorage.setItem('userAuthenticated', 'true');
                sessionStorage.setItem('userEmail', user.email);
                sessionStorage.setItem('userId', user.uid);

                // Update last sign in time
                localStorage.setItem('lastSignInTime', Date.now().toString());
            } else {
                console.log('No user authenticated');

                // Check if we recently had a user (within last 5 seconds)
                const lastSignIn = localStorage.getItem('lastSignInTime');
                if (lastSignIn) {
                    const timeSinceSignIn = Date.now() - parseInt(lastSignIn);
                    if (timeSinceSignIn < 5000) {
                        // User was just signed in, probably a page reload
                        console.log('Recent sign in detected, waiting for auth to restore...');
                        return;
                    }
                }

                // Clear session data only if truly signed out
                sessionStorage.removeItem('userAuthenticated');
                sessionStorage.removeItem('userEmail');
                sessionStorage.removeItem('userId');
            }

            // Notify callbacks
            this.authStateCallbacks.forEach(callback => callback(user));
        });

        // Monitor user activity
        this.setupActivityMonitoring();
    },

    // Setup session keep alive
    setupSessionKeepAlive() {
        // Refresh token periodically
        setInterval(async () => {
            if (this.currentUser) {
                try {
                    await this.currentUser.getIdToken(true);
                    console.log('Token refreshed at', new Date().toLocaleTimeString());
                } catch (error) {
                    console.error('Error refreshing token:', error);
                    // Don't sign out on error - token might still be valid
                }
            }
        }, 30 * 60 * 1000); // Every 30 minutes
    },

    // Monitor user activity
    setupActivityMonitoring() {
        const updateActivity = () => {
            this.lastActivityTime = Date.now();
            localStorage.setItem('lastActivityTime', this.lastActivityTime.toString());
        };

        // Monitor various activities
        ['click', 'keypress', 'mousemove', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, updateActivity, { passive: true });
        });

        // Check for inactivity periodically
        setInterval(() => {
            const inactiveTime = Date.now() - this.lastActivityTime;
            if (inactiveTime > this.sessionTimeout) {
                console.log('Session expired due to inactivity');
                // Only sign out after 24 hours of inactivity
                this.signOut();
            }
        }, 60 * 1000); // Check every minute
    },

    // Add auth state listener
    onAuthStateChanged(callback) {
        this.authStateCallbacks.push(callback);
        // Call immediately with current state
        if (this.isInitialized && callback) {
            callback(this.currentUser);
        }
    },

    // Check if user is authenticated
    isAuthenticated() {
        return this.currentUser !== null;
    },

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    },

    // Wait for auth to be ready
    waitForAuth(timeout = 10000) {
        return new Promise((resolve) => {
            const auth = firebase.auth();

            // If already authenticated, resolve immediately
            if (auth.currentUser) {
                resolve(auth.currentUser);
                return;
            }

            // Wait for auth state
            const unsubscribe = auth.onAuthStateChanged((user) => {
                unsubscribe();
                resolve(user);
            });

            // Timeout fallback
            setTimeout(() => {
                unsubscribe();
                resolve(auth.currentUser);
            }, timeout);
        });
    },

    // Sign out
    async signOut() {
        try {
            await firebase.auth().signOut();

            // Clear all storage
            sessionStorage.clear();
            localStorage.removeItem('lastSignInTime');
            localStorage.removeItem('lastActivityTime');

            console.log('User signed out successfully');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    }
};

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        AuthManager.init();
    });
} else {
    AuthManager.init();
}

// Make AuthManager globally available
window.AuthManager = AuthManager;

// Helper function for pages to check auth
window.checkAuthAndRedirect = async function(requiredAccess = null, redirectUrl = '/index.html') {
    // Wait for auth to be ready
    const user = await AuthManager.waitForAuth(5000);

    if (!user) {
        console.log('No authenticated user, redirecting to:', redirectUrl);
        window.location.href = redirectUrl;
        return false;
    }

    // If specific access is required, check it
    if (requiredAccess === 'admin') {
        const isAdmin = await checkIfUserIsAdmin(user.email);
        if (!isAdmin) {
            console.log('User is not admin, redirecting');
            window.location.href = redirectUrl;
            return false;
        }
    } else if (requiredAccess === 'conference') {
        const hasAccess = await checkConferenceAccess(user.email);
        if (!hasAccess) {
            console.log('User does not have conference access');
            window.location.href = redirectUrl;
            return false;
        }
    }

    return true;
};

// Helper to check if user is admin
async function checkIfUserIsAdmin(email) {
    try {
        const database = firebase.database();

        // Check admins collection
        const adminRef = database.ref(`admins/${email.replace(/\./g, '_')}`);
        const adminSnapshot = await adminRef.once('value');
        const adminData = adminSnapshot.val();

        if (adminData && adminData.active) {
            return true;
        }

        // Check users collection for admin role
        const userRef = database.ref(`users/${email.replace(/\./g, '_')}`);
        const userSnapshot = await userRef.once('value');
        const userData = userSnapshot.val();

        return userData && (userData.role === 'admin' || userData.role === 'super_admin');
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

// Helper to check conference access
async function checkConferenceAccess(email) {
    try {
        const database = firebase.database();
        const userRef = database.ref(`users/${email.replace(/\./g, '_')}`);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val();

        return userData && userData.accessGranted === true;
    } catch (error) {
        console.error('Error checking conference access:', error);
        return false;
    }
}