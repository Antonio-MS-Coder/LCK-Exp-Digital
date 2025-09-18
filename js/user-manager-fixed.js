// Fixed Enhanced User Manager - Working Version
// All features, no CSP issues

console.log('✅ Loading Fixed Enhanced User Manager...');

window.EnhancedUserManager = {
    selectedUsers: new Set(),

    async loadUsers() {
        console.log('Loading users with enhanced UI...');
        const listDiv = document.getElementById('usersList');
        if (!listDiv) return;

        try {
            const database = firebase.database();
            const snapshot = await database.ref('users').once('value');
            const users = snapshot.val() || {};

            if (Object.keys(users).length === 0) {
                listDiv.innerHTML = '<p>No hay usuarios registrados</p>';
                return;
            }

            // Convert to array for easier handling
            const userArray = Object.entries(users).map(([key, user]) => ({
                ...user,
                id: key,
                email: user.email || key.replace(/_/g, '.')
            }));

            // Build enhanced table
            let html = `
                <!-- Filters and Actions -->
                <div style="margin-bottom: 20px;">
                    <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                        <select id="filterRole" onchange="EnhancedUserManager.filterUsers()" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="">Todos los roles</option>
                            <option value="admin">Admin</option>
                            <option value="user">Usuario</option>
                        </select>
                        <select id="filterAccess" onchange="EnhancedUserManager.filterUsers()" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="">Todos los estados</option>
                            <option value="true">Con acceso</option>
                            <option value="false">Sin acceso</option>
                        </select>
                        <button onclick="EnhancedUserManager.exportCSV()" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            📥 Exportar CSV
                        </button>
                    </div>

                    <!-- Bulk Actions Bar -->
                    <div id="bulkActions" style="display: none; padding: 10px; background: #f8f9fa; border-radius: 4px; margin-bottom: 10px;">
                        <span id="selectedCount" style="font-weight: bold; margin-right: 15px;">0 seleccionados</span>
                        <button onclick="EnhancedUserManager.bulkGrantAccess()" style="padding: 5px 10px; background: #28a745; color: white; border: none; border-radius: 3px; margin: 0 5px; cursor: pointer;">
                            ✅ Otorgar Acceso
                        </button>
                        <button onclick="EnhancedUserManager.bulkRevokeAccess()" style="padding: 5px 10px; background: #ffc107; color: #333; border: none; border-radius: 3px; margin: 0 5px; cursor: pointer;">
                            ⛔ Revocar Acceso
                        </button>
                        <button onclick="EnhancedUserManager.bulkDelete()" style="padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 3px; margin: 0 5px; cursor: pointer;">
                            🗑️ Eliminar
                        </button>
                    </div>
                </div>

                <!-- Enhanced Table -->
                <table style="width: 100%; border-collapse: collapse; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <thead>
                        <tr style="background: #2c3e50; color: white;">
                            <th style="padding: 12px; text-align: center; width: 50px;">
                                <input type="checkbox" id="selectAll" onchange="EnhancedUserManager.selectAll(this)">
                            </th>
                            <th style="padding: 12px; text-align: left;">Usuario</th>
                            <th style="padding: 12px; text-align: left;">Rol</th>
                            <th style="padding: 12px; text-align: center;">Acceso</th>
                            <th style="padding: 12px; text-align: left;">Tipo Acceso</th>
                            <th style="padding: 12px; text-align: left;">Registro</th>
                            <th style="padding: 12px; text-align: left;">Última Actividad</th>
                            <th style="padding: 12px; text-align: center;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            for (const user of userArray) {
                const hasAccess = user.accessGranted === true;
                const role = user.role || 'user';
                const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-MX') : 'Desconocido';
                const lastActivity = user.lastActivity ? new Date(user.lastActivity).toLocaleDateString('es-MX') : 'Nunca';

                // Access type badge
                let accessBadge = '';
                if (user.hasPaid) {
                    accessBadge = '<span style="background: #28a745; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px;">Pagó</span>';
                } else if (user.accessType === 'coupon') {
                    accessBadge = '<span style="background: #17a2b8; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px;">Cupón</span>';
                } else if (user.accessType === 'admin-granted') {
                    accessBadge = '<span style="background: #ffc107; color: #333; padding: 2px 8px; border-radius: 3px; font-size: 12px;">Admin</span>';
                } else {
                    accessBadge = '<span style="background: #6c757d; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px;">Sin acceso</span>';
                }

                // Role badge color
                const roleColors = {
                    'admin': '#dc3545',
                    'moderator': '#ffc107',
                    'support': '#17a2b8',
                    'viewer': '#6c757d',
                    'user': '#28a745'
                };

                html += `
                    <tr class="user-row" data-user-id="${user.id}" data-role="${role}" data-access="${hasAccess}" style="border-bottom: 1px solid #dee2e6;">
                        <td style="padding: 12px; text-align: center;">
                            <input type="checkbox" class="user-checkbox" value="${user.id}" onchange="EnhancedUserManager.updateSelection()">
                        </td>
                        <td style="padding: 12px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 35px; height: 35px; border-radius: 50%; background: #d4af37; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                                    ${(user.name || user.email || '?')[0].toUpperCase()}
                                </div>
                                <div>
                                    <div style="font-weight: 600;">${user.name || 'Sin nombre'}</div>
                                    <div style="font-size: 12px; color: #6c757d;">${user.email}</div>
                                </div>
                            </div>
                        </td>
                        <td style="padding: 12px;">
                            <select onchange="EnhancedUserManager.changeRole('${user.id}', this.value)"
                                    style="padding: 4px 8px; border: 1px solid #ddd; border-radius: 3px; background: ${roleColors[role]}; color: white;">
                                <option value="user" ${role === 'user' ? 'selected' : ''}>Usuario</option>
                                <option value="admin" ${role === 'admin' ? 'selected' : ''}>Admin</option>
                                <option value="moderator" ${role === 'moderator' ? 'selected' : ''}>Moderador</option>
                                <option value="support" ${role === 'support' ? 'selected' : ''}>Soporte</option>
                                <option value="viewer" ${role === 'viewer' ? 'selected' : ''}>Visor</option>
                            </select>
                        </td>
                        <td style="padding: 12px; text-align: center;">
                            <label class="switch-container" style="position: relative; display: inline-block; width: 50px; height: 24px;">
                                <input type="checkbox" ${hasAccess ? 'checked' : ''}
                                       onchange="EnhancedUserManager.toggleAccess('${user.id}', this.checked)"
                                       style="opacity: 0; width: 0; height: 0;">
                                <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
                                           background-color: ${hasAccess ? '#28a745' : '#ccc'};
                                           transition: .4s; border-radius: 24px;">
                                    <span style="position: absolute; content: ''; height: 18px; width: 18px;
                                               left: ${hasAccess ? '28px' : '3px'}; bottom: 3px;
                                               background-color: white; transition: .4s; border-radius: 50%;"></span>
                                </span>
                            </label>
                        </td>
                        <td style="padding: 12px;">
                            ${accessBadge}
                        </td>
                        <td style="padding: 12px; font-size: 14px;">${createdAt}</td>
                        <td style="padding: 12px; font-size: 14px;">${lastActivity}</td>
                        <td style="padding: 12px; text-align: center;">
                            <button onclick="EnhancedUserManager.viewDetails('${user.id}')"
                                    style="padding: 4px 8px; margin: 2px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;"
                                    title="Ver detalles">
                                👁️
                            </button>
                            <button onclick="EnhancedUserManager.sendEmail('${user.email}')"
                                    style="padding: 4px 8px; margin: 2px; background: #17a2b8; color: white; border: none; border-radius: 3px; cursor: pointer;"
                                    title="Enviar email">
                                ✉️
                            </button>
                            <button onclick="EnhancedUserManager.deleteUser('${user.id}')"
                                    style="padding: 4px 8px; margin: 2px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;"
                                    title="Eliminar">
                                🗑️
                            </button>
                        </td>
                    </tr>
                `;
            }

            html += `
                    </tbody>
                </table>

                <!-- Stats -->
                <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 4px; display: flex; gap: 20px;">
                    <div><strong>Total:</strong> ${userArray.length}</div>
                    <div><strong>Con acceso:</strong> ${userArray.filter(u => u.accessGranted).length}</div>
                    <div><strong>Pagaron:</strong> ${userArray.filter(u => u.hasPaid).length}</div>
                    <div><strong>Con cupón:</strong> ${userArray.filter(u => u.accessType === 'coupon').length}</div>
                    <div><strong>Admins:</strong> ${userArray.filter(u => u.role === 'admin').length}</div>
                </div>
            `;

            listDiv.innerHTML = html;
            console.log('Enhanced UI loaded successfully!');

        } catch (error) {
            console.error('Error loading users:', error);
            listDiv.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        }
    },

    selectAll(checkbox) {
        const checkboxes = document.querySelectorAll('.user-checkbox');
        checkboxes.forEach(cb => {
            cb.checked = checkbox.checked;
            if (checkbox.checked) {
                this.selectedUsers.add(cb.value);
            } else {
                this.selectedUsers.delete(cb.value);
            }
        });
        this.updateBulkActions();
    },

    updateSelection() {
        this.selectedUsers.clear();
        document.querySelectorAll('.user-checkbox:checked').forEach(cb => {
            this.selectedUsers.add(cb.value);
        });
        this.updateBulkActions();
    },

    updateBulkActions() {
        const bulkActions = document.getElementById('bulkActions');
        const selectedCount = document.getElementById('selectedCount');

        if (this.selectedUsers.size > 0) {
            bulkActions.style.display = 'block';
            selectedCount.textContent = `${this.selectedUsers.size} seleccionados`;
        } else {
            bulkActions.style.display = 'none';
        }
    },

    async toggleAccess(userId, grant) {
        try {
            const database = firebase.database();
            const updates = {
                accessGranted: grant,
                lastModified: Date.now()
            };

            if (grant) {
                updates.accessType = 'admin-granted';
                updates.grantedAt = Date.now();
            }

            await database.ref(`users/${userId}`).update(updates);

            // Update the visual toggle
            const row = document.querySelector(`tr[data-user-id="${userId}"]`);
            if (row) {
                row.dataset.access = grant;
                const toggle = row.querySelector('input[type="checkbox"]');
                const slider = row.querySelector('span[style*="background-color"]');
                if (slider) {
                    slider.style.backgroundColor = grant ? '#28a745' : '#ccc';
                    const knob = slider.querySelector('span');
                    if (knob) {
                        knob.style.left = grant ? '28px' : '3px';
                    }
                }
            }

            console.log(`Access ${grant ? 'granted' : 'revoked'} for user ${userId}`);

        } catch (error) {
            console.error('Error toggling access:', error);
            alert('Error al actualizar acceso');
        }
    },

    async changeRole(userId, newRole) {
        try {
            const database = firebase.database();
            await database.ref(`users/${userId}`).update({
                role: newRole,
                roleChangedAt: Date.now()
            });
            console.log(`Role changed to ${newRole} for user ${userId}`);
        } catch (error) {
            console.error('Error changing role:', error);
            alert('Error al cambiar rol');
        }
    },

    async bulkGrantAccess() {
        if (this.selectedUsers.size === 0) return;

        if (!confirm(`¿Otorgar acceso a ${this.selectedUsers.size} usuarios?`)) return;

        try {
            const database = firebase.database();
            const updates = {};
            const timestamp = Date.now();

            this.selectedUsers.forEach(userId => {
                updates[`users/${userId}/accessGranted`] = true;
                updates[`users/${userId}/accessType`] = 'admin-granted';
                updates[`users/${userId}/grantedAt`] = timestamp;
            });

            await database.ref().update(updates);
            alert(`Acceso otorgado a ${this.selectedUsers.size} usuarios`);
            this.loadUsers();

        } catch (error) {
            console.error('Error in bulk grant:', error);
            alert('Error al otorgar acceso masivo');
        }
    },

    async bulkRevokeAccess() {
        if (this.selectedUsers.size === 0) return;

        if (!confirm(`¿Revocar acceso a ${this.selectedUsers.size} usuarios?`)) return;

        try {
            const database = firebase.database();
            const updates = {};

            this.selectedUsers.forEach(userId => {
                updates[`users/${userId}/accessGranted`] = false;
            });

            await database.ref().update(updates);
            alert(`Acceso revocado a ${this.selectedUsers.size} usuarios`);
            this.loadUsers();

        } catch (error) {
            console.error('Error in bulk revoke:', error);
            alert('Error al revocar acceso masivo');
        }
    },

    async bulkDelete() {
        if (this.selectedUsers.size === 0) return;

        if (!confirm(`¿ELIMINAR ${this.selectedUsers.size} usuarios? Esta acción no se puede deshacer.`)) return;

        try {
            const database = firebase.database();
            const updates = {};

            this.selectedUsers.forEach(userId => {
                updates[`users/${userId}`] = null;
                updates[`userProgress/${userId}`] = null;
            });

            await database.ref().update(updates);
            alert(`${this.selectedUsers.size} usuarios eliminados`);
            this.loadUsers();

        } catch (error) {
            console.error('Error in bulk delete:', error);
            alert('Error al eliminar usuarios');
        }
    },

    async deleteUser(userId) {
        if (!confirm('¿Eliminar este usuario permanentemente?')) return;

        try {
            const database = firebase.database();
            await database.ref(`users/${userId}`).remove();
            await database.ref(`userProgress/${userId}`).remove();

            // Remove row from table
            const row = document.querySelector(`tr[data-user-id="${userId}"]`);
            if (row) row.remove();

            alert('Usuario eliminado');

        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Error al eliminar usuario');
        }
    },

    filterUsers() {
        const roleFilter = document.getElementById('filterRole')?.value;
        const accessFilter = document.getElementById('filterAccess')?.value;
        const searchTerm = document.getElementById('userSearch')?.value.toLowerCase();

        document.querySelectorAll('.user-row').forEach(row => {
            let show = true;

            if (roleFilter && row.dataset.role !== roleFilter) show = false;
            if (accessFilter && row.dataset.access !== accessFilter) show = false;
            if (searchTerm && !row.textContent.toLowerCase().includes(searchTerm)) show = false;

            row.style.display = show ? '' : 'none';
        });
    },

    async viewDetails(userId) {
        try {
            const database = firebase.database();
            const snapshot = await database.ref(`users/${userId}`).once('value');
            const user = snapshot.val();

            alert(`
Detalles del Usuario:
━━━━━━━━━━━━━━━━━━
Email: ${user.email}
Nombre: ${user.name || 'No especificado'}
Rol: ${user.role || 'user'}
Acceso: ${user.accessGranted ? 'Sí' : 'No'}
Tipo: ${user.accessType || 'Ninguno'}
Pagó: ${user.hasPaid ? 'Sí' : 'No'}
Registro: ${user.createdAt ? new Date(user.createdAt).toLocaleString('es-MX') : 'Desconocido'}
            `);

        } catch (error) {
            console.error('Error viewing details:', error);
        }
    },

    sendEmail(email) {
        window.location.href = `mailto:${email}`;
    },

    async exportCSV() {
        try {
            const database = firebase.database();
            const snapshot = await database.ref('users').once('value');
            const users = snapshot.val() || {};

            let csv = 'Email,Nombre,Rol,Acceso,Tipo,Pagó,Registro,Última Actividad\n';

            Object.entries(users).forEach(([key, user]) => {
                csv += `"${user.email || key.replace(/_/g, '.')}","${user.name || ''}","${user.role || 'user'}","${user.accessGranted ? 'Sí' : 'No'}","${user.accessType || ''}","${user.hasPaid ? 'Sí' : 'No'}","${user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-MX') : ''}","${user.lastActivity ? new Date(user.lastActivity).toLocaleDateString('es-MX') : ''}"\n`;
            });

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `usuarios_lck_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();

            alert('Usuarios exportados exitosamente');

        } catch (error) {
            console.error('Error exporting:', error);
            alert('Error al exportar usuarios');
        }
    }
};

console.log('✅ Enhanced User Manager ready!');