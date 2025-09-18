// Enhanced User Management System for LCK Admin Panel
// Features: Roles, Permissions, Bulk Actions, Activity Tracking

// Ensure Firebase is available
const database = firebase.database();
const auth = firebase.auth();

const UserManager = {
    // User roles and their permissions
    ROLES: {
        admin: {
            name: 'Administrador',
            color: '#dc3545',
            permissions: ['all']
        },
        moderator: {
            name: 'Moderador',
            color: '#ffc107',
            permissions: ['view_users', 'manage_content', 'view_analytics']
        },
        support: {
            name: 'Soporte',
            color: '#17a2b8',
            permissions: ['view_users', 'manage_coupons']
        },
        viewer: {
            name: 'Visor',
            color: '#6c757d',
            permissions: ['view_analytics']
        },
        user: {
            name: 'Usuario',
            color: '#28a745',
            permissions: []
        }
    },

    // Initialize user management
    init() {
        console.log('UserManager initializing...');
        this.loadEnhancedUsers();
        // Event listeners will be set up after content is loaded
        this.loadUserStats();
    },

    // Setup event listeners
    setupEventListeners() {
        // Bulk select all
        const selectAllBtn = document.getElementById('selectAllUsers');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('change', (e) => {
                const checkboxes = document.querySelectorAll('.user-checkbox');
                checkboxes.forEach(cb => cb.checked = e.target.checked);
                this.updateBulkActions();
            });
        }

        // Search with debounce
        const searchInput = document.getElementById('userSearch');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => this.filterUsers(e.target.value), 300);
            });
        }

        // Filter by role
        const roleFilter = document.getElementById('roleFilter');
        if (roleFilter) {
            roleFilter.addEventListener('change', (e) => this.filterByRole(e.target.value));
        }

        // Filter by status
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => this.filterByStatus(e.target.value));
        }
    },

    // Load enhanced user list
    async loadEnhancedUsers() {
        const listDiv = document.getElementById('usersList');
        if (!listDiv) {
            console.log('usersList div not found');
            return;
        }

        try {
            console.log('Loading enhanced users...');
            listDiv.innerHTML = '<div class="loading">Cargando usuarios...</div>';

            const snapshot = await database.ref('users').once('value');
            const users = snapshot.val() || {};

            console.log('Users loaded:', Object.keys(users).length, 'users found');

            if (Object.keys(users).length === 0) {
                listDiv.innerHTML = '<p class="text-muted">No hay usuarios registrados</p>';
                return;
            }

            // Convert to array with keys
            const userArray = Object.entries(users).map(([key, user]) => ({
                ...user,
                id: key,
                email: user.email || key.replace(/_/g, '.')
            }));

            // Sort by registration date
            userArray.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            // Build enhanced UI
            let html = `
                <div class="user-controls">
                    <div class="filters-row">
                        <select id="roleFilter" class="filter-select">
                            <option value="">Todos los roles</option>
                            ${Object.entries(this.ROLES).map(([key, role]) =>
                                `<option value="${key}">${role.name}</option>`
                            ).join('')}
                        </select>

                        <select id="statusFilter" class="filter-select">
                            <option value="">Todos los estados</option>
                            <option value="active">Con acceso</option>
                            <option value="inactive">Sin acceso</option>
                            <option value="paid">Pagaron</option>
                            <option value="coupon">Con cupón</option>
                        </select>

                        <button class="btn btn-sm btn-primary" onclick="UserManager.exportUsers()">
                            <i class="fas fa-download"></i> Exportar CSV
                        </button>
                    </div>

                    <div class="bulk-actions" id="bulkActions" style="display: none;">
                        <span class="selected-count">0 usuarios seleccionados</span>
                        <button class="btn btn-sm btn-success" onclick="UserManager.bulkGrantAccess()">
                            <i class="fas fa-check"></i> Otorgar acceso
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="UserManager.bulkRevokeAccess()">
                            <i class="fas fa-times"></i> Revocar acceso
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="UserManager.bulkDelete()">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>

                <div class="user-table-container">
                    <table class="user-table enhanced">
                        <thead>
                            <tr>
                                <th width="30">
                                    <input type="checkbox" id="selectAllUsers">
                                </th>
                                <th>Usuario</th>
                                <th>Rol</th>
                                <th>Acceso</th>
                                <th>Tipo de acceso</th>
                                <th>Registro</th>
                                <th>Última actividad</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            for (const user of userArray) {
                const role = user.role || 'user';
                const roleInfo = this.ROLES[role];
                const hasAccess = user.accessGranted === true;
                const lastActivity = user.lastActivity ?
                    new Date(user.lastActivity).toLocaleDateString('es-MX') : 'Nunca';
                const registrationDate = user.createdAt ?
                    new Date(user.createdAt).toLocaleDateString('es-MX') : 'Desconocido';

                html += `
                    <tr class="user-row" data-user-id="${user.id}" data-role="${role}" data-access="${hasAccess}">
                        <td>
                            <input type="checkbox" class="user-checkbox" value="${user.id}">
                        </td>
                        <td>
                            <div class="user-info">
                                <div class="user-avatar">
                                    ${user.photoURL ?
                                        `<img src="${user.photoURL}" alt="${user.name}">` :
                                        `<span>${(user.name || user.email || '?')[0].toUpperCase()}</span>`
                                    }
                                </div>
                                <div class="user-details">
                                    <div class="user-name">${user.name || 'Sin nombre'}</div>
                                    <div class="user-email">${user.email}</div>
                                </div>
                            </div>
                        </td>
                        <td>
                            <select class="role-select" onchange="UserManager.changeUserRole('${user.id}', this.value)">
                                ${Object.entries(this.ROLES).map(([key, r]) =>
                                    `<option value="${key}" ${key === role ? 'selected' : ''}>${r.name}</option>`
                                ).join('')}
                            </select>
                        </td>
                        <td>
                            <label class="switch">
                                <input type="checkbox" ${hasAccess ? 'checked' : ''}
                                       onchange="UserManager.toggleAccess('${user.id}', this.checked)">
                                <span class="slider"></span>
                            </label>
                        </td>
                        <td>
                            ${this.getAccessTypeBadge(user.accessType, user.hasPaid)}
                        </td>
                        <td>${registrationDate}</td>
                        <td>${lastActivity}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn-icon" onclick="UserManager.viewUserDetails('${user.id}')" title="Ver detalles">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn-icon" onclick="UserManager.sendEmail('${user.email}')" title="Enviar email">
                                    <i class="fas fa-envelope"></i>
                                </button>
                                <button class="btn-icon danger" onclick="UserManager.deleteUser('${user.id}')" title="Eliminar">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }

            html += `
                        </tbody>
                    </table>
                </div>

                <div class="user-stats">
                    <div class="stat">Total: ${userArray.length}</div>
                    <div class="stat">Con acceso: ${userArray.filter(u => u.accessGranted).length}</div>
                    <div class="stat">Pagaron: ${userArray.filter(u => u.hasPaid).length}</div>
                    <div class="stat">Con cupón: ${userArray.filter(u => u.accessType === 'coupon').length}</div>
                </div>
            `;

            listDiv.innerHTML = html;

            // Setup event listeners after content is loaded
            setTimeout(() => {
                this.setupEventListeners();

                // Setup checkbox listeners
                document.querySelectorAll('.user-checkbox').forEach(cb => {
                    cb.addEventListener('change', () => this.updateBulkActions());
                });
            }, 100);

        } catch (error) {
            console.error('Error loading enhanced users:', error);
            listDiv.innerHTML = `<p class="error">Error al cargar usuarios: ${error.message}</p>`;
        }
    },

    // Get access type badge
    getAccessTypeBadge(accessType, hasPaid) {
        if (hasPaid) {
            return '<span class="badge badge-success">Pagó</span>';
        }

        switch(accessType) {
            case 'coupon':
                return '<span class="badge badge-info">Cupón</span>';
            case 'admin-granted':
                return '<span class="badge badge-warning">Admin</span>';
            case 'paid':
                return '<span class="badge badge-success">Pagó</span>';
            default:
                return '<span class="badge badge-secondary">Sin acceso</span>';
        }
    },

    // Toggle user access
    async toggleAccess(userId, grant) {
        try {
            const updates = {
                accessGranted: grant,
                lastModified: firebase.database.ServerValue.TIMESTAMP,
                modifiedBy: firebase.auth().currentUser?.email
            };

            if (grant && !updates.accessType) {
                updates.accessType = 'admin-granted';
                updates.grantedAt = firebase.database.ServerValue.TIMESTAMP;
            }

            await database.ref(`users/${userId}`).update(updates);

            // Log activity
            await this.logActivity('access_change', userId, { granted: grant });

            // Show success message
            this.showNotification(`Acceso ${grant ? 'otorgado' : 'revocado'} exitosamente`, 'success');

        } catch (error) {
            console.error('Error toggling access:', error);
            this.showNotification('Error al actualizar acceso', 'error');
        }
    },

    // Change user role
    async changeUserRole(userId, newRole) {
        try {
            await database.ref(`users/${userId}`).update({
                role: newRole,
                roleChangedAt: firebase.database.ServerValue.TIMESTAMP,
                roleChangedBy: firebase.auth().currentUser?.email
            });

            await this.logActivity('role_change', userId, { role: newRole });
            this.showNotification('Rol actualizado exitosamente', 'success');

        } catch (error) {
            console.error('Error changing role:', error);
            this.showNotification('Error al cambiar rol', 'error');
        }
    },

    // Delete user
    async deleteUser(userId) {
        if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            // Get user data before deletion for logging
            const userSnapshot = await database.ref(`users/${userId}`).once('value');
            const userData = userSnapshot.val();

            // Delete user data
            await database.ref(`users/${userId}`).remove();

            // Delete user progress if exists
            await database.ref(`userProgress/${userId}`).remove();

            await this.logActivity('user_deleted', userId, userData);
            this.showNotification('Usuario eliminado exitosamente', 'success');
            this.loadEnhancedUsers();

        } catch (error) {
            console.error('Error deleting user:', error);
            this.showNotification('Error al eliminar usuario', 'error');
        }
    },

    // Bulk grant access
    async bulkGrantAccess() {
        const selected = this.getSelectedUsers();
        if (selected.length === 0) return;

        if (!confirm(`¿Otorgar acceso a ${selected.length} usuarios?`)) return;

        try {
            const updates = {};
            const timestamp = firebase.database.ServerValue.TIMESTAMP;

            selected.forEach(userId => {
                updates[`users/${userId}/accessGranted`] = true;
                updates[`users/${userId}/accessType`] = 'admin-granted';
                updates[`users/${userId}/grantedAt`] = timestamp;
                updates[`users/${userId}/modifiedBy`] = firebase.auth().currentUser?.email;
            });

            await database.ref().update(updates);
            await this.logActivity('bulk_grant', null, { userIds: selected });

            this.showNotification(`Acceso otorgado a ${selected.length} usuarios`, 'success');
            this.loadEnhancedUsers();

        } catch (error) {
            console.error('Error in bulk grant:', error);
            this.showNotification('Error al otorgar acceso masivo', 'error');
        }
    },

    // Bulk revoke access
    async bulkRevokeAccess() {
        const selected = this.getSelectedUsers();
        if (selected.length === 0) return;

        if (!confirm(`¿Revocar acceso a ${selected.length} usuarios?`)) return;

        try {
            const updates = {};
            const timestamp = firebase.database.ServerValue.TIMESTAMP;

            selected.forEach(userId => {
                updates[`users/${userId}/accessGranted`] = false;
                updates[`users/${userId}/revokedAt`] = timestamp;
                updates[`users/${userId}/modifiedBy`] = firebase.auth().currentUser?.email;
            });

            await database.ref().update(updates);
            await this.logActivity('bulk_revoke', null, { userIds: selected });

            this.showNotification(`Acceso revocado a ${selected.length} usuarios`, 'success');
            this.loadEnhancedUsers();

        } catch (error) {
            console.error('Error in bulk revoke:', error);
            this.showNotification('Error al revocar acceso masivo', 'error');
        }
    },

    // Bulk delete
    async bulkDelete() {
        const selected = this.getSelectedUsers();
        if (selected.length === 0) return;

        if (!confirm(`¿ELIMINAR ${selected.length} usuarios? Esta acción no se puede deshacer.`)) return;

        try {
            const updates = {};

            selected.forEach(userId => {
                updates[`users/${userId}`] = null;
                updates[`userProgress/${userId}`] = null;
            });

            await database.ref().update(updates);
            await this.logActivity('bulk_delete', null, { userIds: selected });

            this.showNotification(`${selected.length} usuarios eliminados`, 'success');
            this.loadEnhancedUsers();

        } catch (error) {
            console.error('Error in bulk delete:', error);
            this.showNotification('Error al eliminar usuarios', 'error');
        }
    },

    // Get selected users
    getSelectedUsers() {
        const checkboxes = document.querySelectorAll('.user-checkbox:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    },

    // Update bulk actions visibility
    updateBulkActions() {
        const selected = this.getSelectedUsers();
        const bulkActions = document.getElementById('bulkActions');

        if (bulkActions) {
            if (selected.length > 0) {
                bulkActions.style.display = 'flex';
                bulkActions.querySelector('.selected-count').textContent =
                    `${selected.length} usuarios seleccionados`;
            } else {
                bulkActions.style.display = 'none';
            }
        }
    },

    // Filter users
    filterUsers(searchTerm) {
        const rows = document.querySelectorAll('.user-row');
        const term = searchTerm.toLowerCase();

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(term) ? '' : 'none';
        });
    },

    // Filter by role
    filterByRole(role) {
        const rows = document.querySelectorAll('.user-row');

        rows.forEach(row => {
            if (role === '') {
                row.style.display = '';
            } else {
                row.style.display = row.dataset.role === role ? '' : 'none';
            }
        });
    },

    // Filter by status
    filterByStatus(status) {
        const rows = document.querySelectorAll('.user-row');

        rows.forEach(row => {
            if (status === '') {
                row.style.display = '';
            } else if (status === 'active') {
                row.style.display = row.dataset.access === 'true' ? '' : 'none';
            } else if (status === 'inactive') {
                row.style.display = row.dataset.access === 'false' ? '' : 'none';
            }
        });
    },

    // View user details
    async viewUserDetails(userId) {
        try {
            const userSnapshot = await database.ref(`users/${userId}`).once('value');
            const user = userSnapshot.val();

            const progressSnapshot = await database.ref(`userProgress/${userId}`).once('value');
            const progress = progressSnapshot.val();

            // Create modal with user details
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.innerHTML = `
                <div class="modal-content user-details-modal">
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                    <h2>Detalles del Usuario</h2>

                    <div class="user-detail-section">
                        <h3>Información Personal</h3>
                        <p><strong>Nombre:</strong> ${user.name || 'No especificado'}</p>
                        <p><strong>Email:</strong> ${user.email}</p>
                        <p><strong>ID:</strong> ${userId}</p>
                        <p><strong>Rol:</strong> ${this.ROLES[user.role || 'user'].name}</p>
                    </div>

                    <div class="user-detail-section">
                        <h3>Acceso</h3>
                        <p><strong>Acceso otorgado:</strong> ${user.accessGranted ? 'Sí' : 'No'}</p>
                        <p><strong>Tipo de acceso:</strong> ${user.accessType || 'Ninguno'}</p>
                        <p><strong>Ha pagado:</strong> ${user.hasPaid ? 'Sí' : 'No'}</p>
                        ${user.couponUsed ? `<p><strong>Cupón usado:</strong> ${user.couponUsed}</p>` : ''}
                    </div>

                    <div class="user-detail-section">
                        <h3>Fechas</h3>
                        <p><strong>Registro:</strong> ${user.createdAt ? new Date(user.createdAt).toLocaleString('es-MX') : 'Desconocido'}</p>
                        <p><strong>Última actividad:</strong> ${user.lastActivity ? new Date(user.lastActivity).toLocaleString('es-MX') : 'Nunca'}</p>
                        ${user.grantedAt ? `<p><strong>Acceso otorgado:</strong> ${new Date(user.grantedAt).toLocaleString('es-MX')}</p>` : ''}
                    </div>

                    ${progress ? `
                        <div class="user-detail-section">
                            <h3>Progreso</h3>
                            <p><strong>Conferencias vistas:</strong> ${Object.keys(progress.conferences || {}).length}</p>
                            <p><strong>Última conferencia:</strong> ${progress.lastWatchedId || 'Ninguna'}</p>
                        </div>
                    ` : ''}
                </div>
            `;

            document.body.appendChild(modal);

        } catch (error) {
            console.error('Error viewing user details:', error);
            this.showNotification('Error al cargar detalles del usuario', 'error');
        }
    },

    // Send email to user
    sendEmail(email) {
        window.location.href = `mailto:${email}`;
    },

    // Export users to CSV
    async exportUsers() {
        try {
            const snapshot = await database.ref('users').once('value');
            const users = snapshot.val() || {};

            let csv = 'Email,Nombre,Rol,Acceso,Tipo de Acceso,Pagó,Registro,Última Actividad\n';

            Object.entries(users).forEach(([key, user]) => {
                const email = user.email || key.replace(/_/g, '.');
                csv += `"${email}","${user.name || ''}","${user.role || 'user'}","${user.accessGranted ? 'Sí' : 'No'}","${user.accessType || ''}","${user.hasPaid ? 'Sí' : 'No'}","${user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-MX') : ''}","${user.lastActivity ? new Date(user.lastActivity).toLocaleDateString('es-MX') : ''}"\n`;
            });

            // Download CSV
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `usuarios_lck_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();

            this.showNotification('Usuarios exportados exitosamente', 'success');

        } catch (error) {
            console.error('Error exporting users:', error);
            this.showNotification('Error al exportar usuarios', 'error');
        }
    },

    // Load user statistics
    async loadUserStats() {
        try {
            const snapshot = await database.ref('users').once('value');
            const users = Object.values(snapshot.val() || {});

            const stats = {
                total: users.length,
                withAccess: users.filter(u => u.accessGranted).length,
                paid: users.filter(u => u.hasPaid).length,
                coupon: users.filter(u => u.accessType === 'coupon').length,
                admins: users.filter(u => u.role === 'admin').length,
                recentlyActive: users.filter(u => {
                    if (!u.lastActivity) return false;
                    const daysSinceActive = (Date.now() - u.lastActivity) / (1000 * 60 * 60 * 24);
                    return daysSinceActive < 7;
                }).length
            };

            // Update dashboard if it exists
            const dashboardStats = document.getElementById('userStatsDetail');
            if (dashboardStats) {
                dashboardStats.innerHTML = `
                    <div class="stat-grid">
                        <div class="stat-item">
                            <div class="stat-value">${stats.total}</div>
                            <div class="stat-label">Total usuarios</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${stats.withAccess}</div>
                            <div class="stat-label">Con acceso</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${stats.paid}</div>
                            <div class="stat-label">Pagaron</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${stats.recentlyActive}</div>
                            <div class="stat-label">Activos (7 días)</div>
                        </div>
                    </div>
                `;
            }

        } catch (error) {
            console.error('Error loading user stats:', error);
        }
    },

    // Log activity
    async logActivity(action, userId, details) {
        try {
            const logEntry = {
                action,
                userId,
                details,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                performedBy: firebase.auth().currentUser?.email
            };

            await database.ref('adminLogs').push(logEntry);

        } catch (error) {
            console.error('Error logging activity:', error);
        }
    },

    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
};

// Export for global access
window.UserManager = UserManager;

// Don't auto-initialize - will be called from admin.js when users tab is activated
// The init() function is not needed since we call loadEnhancedUsers directly