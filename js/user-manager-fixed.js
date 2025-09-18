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

            // Add CSS animations and styles
            if (!document.getElementById('enhancedStyles')) {
                const style = document.createElement('style');
                style.id = 'enhancedStyles';
                style.innerHTML = `
                    @keyframes slideDown {
                        from { opacity: 0; transform: translateY(-10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes pulse {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.05); }
                    }
                    .user-row:hover {
                        transform: translateX(4px);
                        box-shadow: 0 4px 12px rgba(212, 175, 55, 0.08);
                    }
                    select:hover, button:hover {
                        animation: pulse 0.3s ease;
                    }
                    #filterRole:hover, #filterAccess:hover {
                        border-color: #d4af37 !important;
                        box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.1) !important;
                    }
                `;
                document.head.appendChild(style);
            }

            // Build enhanced table
            let html = `
                <!-- Filters and Actions -->
                <div style="margin-bottom: 20px;">
                    <div style="display: flex; gap: 12px; margin-bottom: 15px; flex-wrap: wrap;">
                        <select id="filterRole" onchange="EnhancedUserManager.filterUsers()"
                                style="padding: 10px 16px; border: 2px solid #e0e0e0; border-radius: 8px;
                                       background: white; font-size: 14px; font-weight: 500; cursor: pointer;
                                       transition: all 0.3s ease; min-width: 150px;">
                            <option value="">🎭 Todos los roles</option>
                            <option value="admin">👑 Admin</option>
                            <option value="moderator">🛡️ Moderador</option>
                            <option value="support">💬 Soporte</option>
                            <option value="viewer">👀 Visor</option>
                            <option value="user">👤 Usuario</option>
                        </select>
                        <select id="filterAccess" onchange="EnhancedUserManager.filterUsers()"
                                style="padding: 10px 16px; border: 2px solid #e0e0e0; border-radius: 8px;
                                       background: white; font-size: 14px; font-weight: 500; cursor: pointer;
                                       transition: all 0.3s ease; min-width: 150px;">
                            <option value="">📊 Todos los estados</option>
                            <option value="true">✅ Con acceso</option>
                            <option value="false">🚫 Sin acceso</option>
                        </select>
                        <button onclick="EnhancedUserManager.exportCSV()"
                                style="padding: 10px 20px; background: linear-gradient(135deg, #d4af37, #f4e4bc);
                                       color: #1a1a1a; border: none; border-radius: 8px; cursor: pointer;
                                       font-weight: 600; font-size: 14px; transition: all 0.3s ease;
                                       box-shadow: 0 2px 8px rgba(212, 175, 55, 0.3);">
                            📥 Exportar CSV
                        </button>
                    </div>

                    <!-- Bulk Actions Bar -->
                    <div id="bulkActions" style="display: none; padding: 16px; background: linear-gradient(135deg, #fff9e6, #fff);
                                                   border: 2px solid #d4af37; border-radius: 12px; margin-bottom: 16px;
                                                   box-shadow: 0 4px 12px rgba(212, 175, 55, 0.15); animation: slideDown 0.3s ease;">
                        <span id="selectedCount" style="font-weight: 600; margin-right: 20px; color: #1a1a1a; font-size: 15px;">0 seleccionados</span>
                        <button onclick="EnhancedUserManager.bulkGrantAccess()"
                                style="padding: 8px 16px; background: linear-gradient(135deg, #10b981, #059669);
                                       color: white; border: none; border-radius: 6px; margin: 0 6px; cursor: pointer;
                                       font-weight: 500; font-size: 14px; transition: all 0.3s ease;
                                       box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);">
                            ✅ Otorgar Acceso
                        </button>
                        <button onclick="EnhancedUserManager.bulkRevokeAccess()"
                                style="padding: 8px 16px; background: linear-gradient(135deg, #f59e0b, #d97706);
                                       color: white; border: none; border-radius: 6px; margin: 0 6px; cursor: pointer;
                                       font-weight: 500; font-size: 14px; transition: all 0.3s ease;
                                       box-shadow: 0 2px 6px rgba(245, 158, 11, 0.3);">
                            ⛔ Revocar Acceso
                        </button>
                        <button onclick="EnhancedUserManager.bulkDelete()"
                                style="padding: 8px 16px; background: linear-gradient(135deg, #ef4444, #dc2626);
                                       color: white; border: none; border-radius: 6px; margin: 0 6px; cursor: pointer;
                                       font-weight: 500; font-size: 14px; transition: all 0.3s ease;
                                       box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);">
                            🗑️ Eliminar
                        </button>
                    </div>
                </div>

                <!-- Enhanced Table -->
                <table style="width: 100%; border-collapse: separate; border-spacing: 0; background: white;
                              border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">
                    <thead>
                        <tr style="background: linear-gradient(135deg, #1a1a1a, #2d2d2d); color: white;">
                            <th style="padding: 16px 12px; text-align: center; width: 50px; font-weight: 600; font-size: 14px;">
                                <input type="checkbox" id="selectAll" onchange="EnhancedUserManager.selectAll(this)"
                                       style="width: 18px; height: 18px; cursor: pointer;">
                            </th>
                            <th style="padding: 16px; text-align: left; font-weight: 600; font-size: 14px; letter-spacing: 0.5px;">USUARIO</th>
                            <th style="padding: 16px; text-align: left; font-weight: 600; font-size: 14px; letter-spacing: 0.5px;">ROL</th>
                            <th style="padding: 16px; text-align: center; font-weight: 600; font-size: 14px; letter-spacing: 0.5px;">ACCESO</th>
                            <th style="padding: 16px; text-align: left; font-weight: 600; font-size: 14px; letter-spacing: 0.5px;">TIPO ACCESO</th>
                            <th style="padding: 16px; text-align: left; font-weight: 600; font-size: 14px; letter-spacing: 0.5px;">REGISTRO</th>
                            <th style="padding: 16px; text-align: left; font-weight: 600; font-size: 14px; letter-spacing: 0.5px;">ACTIVIDAD</th>
                            <th style="padding: 16px; text-align: center; font-weight: 600; font-size: 14px; letter-spacing: 0.5px;">ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            for (const user of userArray) {
                const hasAccess = user.accessGranted === true;
                const role = user.role || 'user';
                const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-MX') : 'Desconocido';
                const lastActivity = user.lastActivity ? new Date(user.lastActivity).toLocaleDateString('es-MX') : 'Nunca';

                // Access type badge with improved colors
                let accessBadge = '';
                if (user.hasPaid) {
                    accessBadge = '<span style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);">PAGÓ 💵</span>';
                } else if (user.accessType === 'coupon') {
                    accessBadge = '<span style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(139, 92, 246, 0.2);">CUPÓN 🎟️</span>';
                } else if (user.accessType === 'admin-granted') {
                    accessBadge = '<span style="background: linear-gradient(135deg, #d4af37, #b8941f); color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(212, 175, 55, 0.2);">ADMIN 👑</span>';
                } else {
                    accessBadge = '<span style="background: linear-gradient(135deg, #9ca3af, #6b7280); color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px;">SIN ACCESO</span>';
                }

                // Role badge colors with better contrast
                const roleColors = {
                    'admin': 'linear-gradient(135deg, #dc2626, #b91c1c)',
                    'moderator': 'linear-gradient(135deg, #f59e0b, #d97706)',
                    'support': 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                    'viewer': 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                    'user': 'linear-gradient(135deg, #10b981, #059669)'
                };

                html += `
                    <tr class="user-row" data-user-id="${user.id}" data-role="${role}" data-access="${hasAccess}"
                        style="border-bottom: 1px solid #f3f4f6; transition: all 0.2s ease;"
                        onmouseover="this.style.background='#fafafa'" onmouseout="this.style.background='white'">
                        <td style="padding: 16px 12px; text-align: center;">
                            <input type="checkbox" class="user-checkbox" value="${user.id}" onchange="EnhancedUserManager.updateSelection()"
                                   style="width: 18px; height: 18px; cursor: pointer;">
                        </td>
                        <td style="padding: 16px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="width: 42px; height: 42px; border-radius: 50%;
                                           background: linear-gradient(135deg, #d4af37, #f4e4bc);
                                           color: #1a1a1a; display: flex; align-items: center; justify-content: center;
                                           font-weight: 700; font-size: 16px; box-shadow: 0 2px 8px rgba(212, 175, 55, 0.2);">
                                    ${(user.name || user.email || '?')[0].toUpperCase()}
                                </div>
                                <div>
                                    <div style="font-weight: 600; color: #1a1a1a; font-size: 14px;">${user.name || 'Sin nombre'}</div>
                                    <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">${user.email}</div>
                                </div>
                            </div>
                        </td>
                        <td style="padding: 16px;">
                            <select onchange="EnhancedUserManager.changeRole('${user.id}', this.value)"
                                    style="padding: 6px 12px; border: none; border-radius: 20px;
                                           background: ${roleColors[role]}; color: white;
                                           font-weight: 600; font-size: 12px; cursor: pointer;
                                           box-shadow: 0 2px 6px rgba(0,0,0,0.1); transition: all 0.3s ease;">
                                <option value="user" ${role === 'user' ? 'selected' : ''}>👤 Usuario</option>
                                <option value="admin" ${role === 'admin' ? 'selected' : ''}>👑 Admin</option>
                                <option value="moderator" ${role === 'moderator' ? 'selected' : ''}>🛡️ Moderador</option>
                                <option value="support" ${role === 'support' ? 'selected' : ''}>💬 Soporte</option>
                                <option value="viewer" ${role === 'viewer' ? 'selected' : ''}>👀 Visor</option>
                            </select>
                        </td>
                        <td style="padding: 16px; text-align: center;">
                            <label class="switch-container" style="position: relative; display: inline-block; width: 52px; height: 28px;">
                                <input type="checkbox" ${hasAccess ? 'checked' : ''}
                                       onchange="EnhancedUserManager.toggleAccess('${user.id}', this.checked)"
                                       style="opacity: 0; width: 0; height: 0;">
                                <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
                                           background: ${hasAccess ? 'linear-gradient(135deg, #d4af37, #f4e4bc)' : 'linear-gradient(135deg, #e5e7eb, #d1d5db)'};
                                           transition: .4s; border-radius: 28px;
                                           box-shadow: ${hasAccess ? 'inset 0 2px 4px rgba(212, 175, 55, 0.3)' : 'inset 0 2px 4px rgba(0,0,0,0.1)'};
                                           border: 1px solid ${hasAccess ? '#d4af37' : '#e5e7eb'};">
                                    <span style="position: absolute; content: ''; height: 22px; width: 22px;
                                               left: ${hasAccess ? '28px' : '3px'}; bottom: 2px;
                                               background: white; transition: .4s; border-radius: 50%;
                                               box-shadow: 0 2px 6px rgba(0,0,0,0.15);"></span>
                                </span>
                            </label>
                        </td>
                        <td style="padding: 12px;">
                            ${accessBadge}
                        </td>
                        <td style="padding: 16px; font-size: 13px; color: #4b5563;">${createdAt}</td>
                        <td style="padding: 16px; font-size: 13px; color: #4b5563;">${lastActivity}</td>
                        <td style="padding: 16px; text-align: center;">
                            <button onclick="EnhancedUserManager.viewDetails('${user.id}')"
                                    style="padding: 8px; margin: 0 3px; background: linear-gradient(135deg, #3b82f6, #2563eb);
                                           color: white; border: none; border-radius: 8px; cursor: pointer;
                                           font-size: 14px; transition: all 0.3s ease;
                                           box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);"
                                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(59, 130, 246, 0.3)'"
                                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(59, 130, 246, 0.2)'"
                                    title="Ver detalles">
                                👁️
                            </button>
                            <button onclick="EnhancedUserManager.sendEmail('${user.email}')"
                                    style="padding: 8px; margin: 0 3px; background: linear-gradient(135deg, #06b6d4, #0891b2);
                                           color: white; border: none; border-radius: 8px; cursor: pointer;
                                           font-size: 14px; transition: all 0.3s ease;
                                           box-shadow: 0 2px 4px rgba(6, 182, 212, 0.2);"
                                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(6, 182, 212, 0.3)'"
                                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(6, 182, 212, 0.2)'"
                                    title="Enviar email">
                                ✉️
                            </button>
                            <button onclick="EnhancedUserManager.deleteUser('${user.id}')"
                                    style="padding: 8px; margin: 0 3px; background: linear-gradient(135deg, #ef4444, #dc2626);
                                           color: white; border: none; border-radius: 8px; cursor: pointer;
                                           font-size: 14px; transition: all 0.3s ease;
                                           box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);"
                                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(239, 68, 68, 0.3)'"
                                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(239, 68, 68, 0.2)'"
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
                <div style="margin-top: 24px; padding: 20px; background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
                           border-radius: 12px; display: flex; gap: 32px; flex-wrap: wrap;
                           box-shadow: 0 4px 16px rgba(0,0,0,0.1);">
                    <div style="text-align: center;">
                        <div style="font-size: 28px; font-weight: 700; color: #d4af37; margin-bottom: 4px;">${userArray.length}</div>
                        <div style="font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Total</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 28px; font-weight: 700; color: #10b981; margin-bottom: 4px;">${userArray.filter(u => u.accessGranted).length}</div>
                        <div style="font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Con Acceso</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 28px; font-weight: 700; color: #3b82f6; margin-bottom: 4px;">${userArray.filter(u => u.hasPaid).length}</div>
                        <div style="font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Pagaron</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 28px; font-weight: 700; color: #8b5cf6; margin-bottom: 4px;">${userArray.filter(u => u.accessType === 'coupon').length}</div>
                        <div style="font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Cupón</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 28px; font-weight: 700; color: #ef4444; margin-bottom: 4px;">${userArray.filter(u => u.role === 'admin').length}</div>
                        <div style="font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Admins</div>
                    </div>
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

            // Update the visual toggle with golden color
            const row = document.querySelector(`tr[data-user-id="${userId}"]`);
            if (row) {
                row.dataset.access = grant;
                const toggle = row.querySelector('input[type="checkbox"]');
                const slider = row.querySelector('span[style*="background"]');
                if (slider) {
                    slider.style.background = grant ? 'linear-gradient(135deg, #d4af37, #f4e4bc)' : 'linear-gradient(135deg, #e5e7eb, #d1d5db)';
                    slider.style.boxShadow = grant ? 'inset 0 2px 4px rgba(212, 175, 55, 0.3)' : 'inset 0 2px 4px rgba(0,0,0,0.1)';
                    slider.style.border = `1px solid ${grant ? '#d4af37' : '#e5e7eb'}`;
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