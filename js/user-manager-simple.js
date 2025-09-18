// Simple User Management for LCK Admin Panel
// Focus on functionality, not fancy UI

const SimpleUserManager = {
    // Load and display users
    async loadUsers() {
        const listDiv = document.getElementById('usersList');
        if (!listDiv) {
            console.error('usersList element not found');
            return;
        }

        try {
            console.log('Loading users from Firebase...');

            // Get reference to Firebase database
            const database = firebase.database();
            const snapshot = await database.ref('users').once('value');
            const users = snapshot.val() || {};

            console.log(`Found ${Object.keys(users).length} users`);

            if (Object.keys(users).length === 0) {
                listDiv.innerHTML = '<p>No hay usuarios registrados</p>';
                return;
            }

            // Build simple table
            let html = `
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #333; color: white;">
                            <th style="padding: 10px; text-align: left;">Email</th>
                            <th style="padding: 10px; text-align: left;">Nombre</th>
                            <th style="padding: 10px; text-align: left;">Acceso</th>
                            <th style="padding: 10px; text-align: left;">Tipo</th>
                            <th style="padding: 10px; text-align: left;">Registro</th>
                            <th style="padding: 10px; text-align: left;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            // Add each user
            for (const [key, user] of Object.entries(users)) {
                const email = user.email || key.replace(/_/g, '.');
                const name = user.name || 'Sin nombre';
                const hasAccess = user.accessGranted ? 'Sí' : 'No';
                const accessType = user.accessType || 'ninguno';
                const createdAt = user.createdAt ?
                    new Date(user.createdAt).toLocaleDateString('es-MX') :
                    'Desconocido';

                html += `
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 10px;">${email}</td>
                        <td style="padding: 10px;">${name}</td>
                        <td style="padding: 10px;">
                            <span style="color: ${user.accessGranted ? 'green' : 'red'};">
                                ${hasAccess}
                            </span>
                        </td>
                        <td style="padding: 10px;">${accessType}</td>
                        <td style="padding: 10px;">${createdAt}</td>
                        <td style="padding: 10px;">
                            <button onclick="SimpleUserManager.toggleAccess('${key}', ${!user.accessGranted})"
                                    style="padding: 5px 10px; margin-right: 5px; cursor: pointer;">
                                ${user.accessGranted ? 'Revocar' : 'Otorgar'} Acceso
                            </button>
                            <button onclick="SimpleUserManager.deleteUser('${key}')"
                                    style="padding: 5px 10px; background: #dc3545; color: white; cursor: pointer; border: none;">
                                Eliminar
                            </button>
                        </td>
                    </tr>
                `;
            }

            html += `
                    </tbody>
                </table>
                <div style="margin-top: 20px; padding: 10px; background: #f8f9fa;">
                    <strong>Total usuarios:</strong> ${Object.keys(users).length} |
                    <strong>Con acceso:</strong> ${Object.values(users).filter(u => u.accessGranted).length}
                </div>
            `;

            listDiv.innerHTML = html;

        } catch (error) {
            console.error('Error loading users:', error);
            listDiv.innerHTML = `<p style="color: red;">Error al cargar usuarios: ${error.message}</p>`;
        }
    },

    // Toggle user access
    async toggleAccess(userId, grant) {
        if (!confirm(`¿${grant ? 'Otorgar' : 'Revocar'} acceso a este usuario?`)) {
            return;
        }

        try {
            const database = firebase.database();
            const updates = {
                accessGranted: grant
            };

            if (grant) {
                updates.accessType = 'admin-granted';
                updates.grantedAt = firebase.database.ServerValue.TIMESTAMP;
            }

            await database.ref(`users/${userId}`).update(updates);
            alert(`Acceso ${grant ? 'otorgado' : 'revocado'} exitosamente`);

            // Reload the list
            this.loadUsers();

        } catch (error) {
            console.error('Error updating access:', error);
            alert('Error al actualizar acceso: ' + error.message);
        }
    },

    // Delete user
    async deleteUser(userId) {
        if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            const database = firebase.database();

            // Delete user data
            await database.ref(`users/${userId}`).remove();

            // Also delete user progress if exists
            await database.ref(`userProgress/${userId}`).remove();

            alert('Usuario eliminado exitosamente');

            // Reload the list
            this.loadUsers();

        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Error al eliminar usuario: ' + error.message);
        }
    },

    // Search functionality
    searchUsers() {
        const searchTerm = document.getElementById('userSearch')?.value.toLowerCase() || '';
        const rows = document.querySelectorAll('#usersList tbody tr');

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    }
};

// Export for global access
window.SimpleUserManager = SimpleUserManager;