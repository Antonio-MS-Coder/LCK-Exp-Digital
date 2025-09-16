// Admin Authentication System - Improved Version
// LCK Experience Digital
// Consistent with no-signout logic and better connection handling

// Set Firebase persistence to LOCAL immediately
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .then(() => {
            console.log('Admin auth persistence set to LOCAL');
        })
        .catch((error) => {
            console.error('Error setting persistence:', error);
        });
}

const AdminAuth = {
    auth: null,
    database: null,
    currentUser: null,
    isInitialized: false,
    connectionRetries: 0,
    maxRetries: 5,
    retryDelay: 3000,
    authCheckTimeout: null,

    // Initialize the admin auth system
    async init() {
        if (this.isInitialized) return this.currentUser !== null;

        this.auth = firebase.auth();
        this.database = firebase.database();
        this.isInitialized = true;

        console.log('Initializing Admin Auth System...');

        // Wait for auth with retries for poor connections
        const user = await this.waitForAuthWithRetry();

        if (user) {
            const isAdmin = await this.verifyAdminAccess(user);
            if (isAdmin) {
                this.currentUser = user;
                this.setupSessionMaintenance();
                this.updateUI(user);
                return true;
            } else {
                // Not an admin, but don't sign out immediately
                console.log('User is not admin, showing access denied');
                this.showAccessDenied();
                return false;
            }
        }

        return false;
    },

    // Wait for auth with retry logic
    async waitForAuthWithRetry() {
        return new Promise((resolve) => {
            let resolved = false;
            let unsubscribe = null;

            // Set a longer timeout for poor connections (30 seconds)
            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    console.log('Auth timeout reached, checking current state...');

                    // Check one more time before giving up
                    if (this.auth.currentUser) {
                        resolve(this.auth.currentUser);
                    } else if (this.connectionRetries < this.maxRetries) {
                        this.connectionRetries++;
                        console.log(`Retry attempt ${this.connectionRetries}/${this.maxRetries}`);

                        // Try again
                        setTimeout(() => {
                            this.waitForAuthWithRetry().then(resolve);
                        }, this.retryDelay);
                    } else {
                        // Only redirect after all retries
                        console.log('No auth after all retries');
                        if (unsubscribe) unsubscribe();
                        resolve(null);
                    }
                }
            }, 30000); // 30 seconds timeout

            // Listen for auth state
            unsubscribe = this.auth.onAuthStateChanged((user) => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);

                    if (user) {
                        console.log('User authenticated:', user.email);
                        this.connectionRetries = 0; // Reset retries on success
                    } else {
                        console.log('No user in auth state');
                    }

                    if (unsubscribe) unsubscribe();
                    resolve(user);
                }
            });

            // Also check if user is already logged in
            setTimeout(() => {
                if (!resolved && this.auth.currentUser) {
                    resolved = true;
                    clearTimeout(timeout);
                    if (unsubscribe) unsubscribe();
                    console.log('Found existing user:', this.auth.currentUser.email);
                    resolve(this.auth.currentUser);
                }
            }, 1000);
        });
    },

    // Verify admin access
    async verifyAdminAccess(user) {
        if (!user) return false;

        try {
            const email = user.email.replace(/\./g, '_');

            // Check in admins collection first
            const adminRef = this.database.ref(`admins/${email}`);
            const adminSnapshot = await adminRef.once('value');
            const adminData = adminSnapshot.val();

            if (adminData && adminData.active) {
                console.log('Admin verified via admins collection');
                sessionStorage.setItem('isAdmin', 'true');
                sessionStorage.setItem('adminRole', adminData.role || 'admin');
                return true;
            }

            // Check in users collection for admin role
            const userRef = this.database.ref(`users/${email}`);
            const userSnapshot = await userRef.once('value');
            const userData = userSnapshot.val();

            if (userData && (userData.role === 'admin' || userData.role === 'super_admin')) {
                console.log('Admin verified via users collection');
                sessionStorage.setItem('isAdmin', 'true');
                sessionStorage.setItem('adminRole', userData.role);
                return true;
            }

            // Check session storage as last resort
            const cachedStatus = sessionStorage.getItem('isAdmin');
            if (cachedStatus === 'true') {
                console.log('Admin verified via session cache');
                return true;
            }

            return false;

        } catch (error) {
            console.error('Error verifying admin access:', error);

            // On error, check cache
            const cachedStatus = sessionStorage.getItem('isAdmin');
            return cachedStatus === 'true';
        }
    },

    // Setup session maintenance
    setupSessionMaintenance() {
        // Refresh token less aggressively
        setInterval(async () => {
            if (this.auth.currentUser) {
                try {
                    await this.auth.currentUser.getIdToken(false);
                    console.log('Admin token refreshed at', new Date().toLocaleTimeString());
                } catch (error) {
                    console.error('Error refreshing token:', error);
                    // Don't sign out on error
                }
            }
        }, 30 * 60 * 1000); // Every 30 minutes

        // Keep session alive in database
        setInterval(async () => {
            if (this.auth.currentUser) {
                try {
                    const sessionRef = this.database.ref(`adminSessions/${this.auth.currentUser.uid}`);
                    await sessionRef.update({
                        lastActivity: Date.now(),
                        email: this.auth.currentUser.email
                    });
                } catch (error) {
                    console.error('Error updating admin session:', error);
                    // Don't sign out on error
                }
            }
        }, 5 * 60 * 1000); // Every 5 minutes

        // Monitor online/offline
        window.addEventListener('online', () => {
            console.log('Connection restored');
            if (!this.currentUser && this.auth) {
                this.init();
            }
        });

        window.addEventListener('offline', () => {
            console.log('Connection lost - maintaining admin session');
            // Don't sign out on connection loss
        });
    },

    // Update UI with user info
    updateUI(user) {
        const emailElement = document.getElementById('adminEmail');
        if (emailElement) {
            emailElement.textContent = user.email;
        }

        // Store in session
        sessionStorage.setItem('adminEmail', user.email);
        sessionStorage.setItem('adminAuthenticated', 'true');
    },

    // Show access denied message
    showAccessDenied() {
        // Don't redirect immediately, show message
        const message = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                text-align: center;
                z-index: 9999;
            ">
                <h2 style="color: #d32f2f; margin-bottom: 15px;">Acceso Denegado</h2>
                <p style="margin-bottom: 20px;">No tienes permisos de administrador.</p>
                <button onclick="window.location.href='/admin-login.html'" style="
                    background: var(--accent-gold);
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                ">Volver al Login</button>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', message);
    },

    // Sign out function
    async signOut() {
        try {
            // Clear session data
            sessionStorage.clear();
            localStorage.removeItem('adminEmail');
            localStorage.removeItem('lastAdminSignIn');

            // Sign out from Firebase
            await this.auth.signOut();

            console.log('Admin signed out successfully');
            window.location.href = '/admin-login.html';

        } catch (error) {
            console.error('Error signing out:', error);
            alert('Error al cerrar sesión');
        }
    },

    // Check if currently authenticated
    isAuthenticated() {
        return this.currentUser !== null || this.auth?.currentUser !== null;
    },

    // Get current user
    getCurrentUser() {
        return this.currentUser || this.auth?.currentUser;
    }
};

// Make AdminAuth globally available
window.AdminAuth = AdminAuth;

// Auto-initialize on admin pages
if (window.location.pathname.includes('admin') && !window.location.pathname.includes('login')) {
    document.addEventListener('DOMContentLoaded', () => {
        AdminAuth.init().then(isAuthenticated => {
            if (!isAuthenticated) {
                console.log('Admin authentication failed');
                // Don't redirect immediately - let user see the error
                setTimeout(() => {
                    if (!AdminAuth.isAuthenticated()) {
                        window.location.href = '/admin-login.html';
                    }
                }, 5000);
            }
        });
    });
}