// Admin Panel JavaScript - LCK Experience Digital

// Initialize Firebase services
const auth = firebase.auth();
const database = firebase.database();
const storage = firebase.storage();

// Initialize admin authentication with improved system
window.addEventListener('DOMContentLoaded', async () => {
    try {
        // Clear any redirect flags now that we're on admin page
        sessionStorage.removeItem('adminRedirecting');

        // Use the improved admin auth system
        if (window.AdminAuth) {
            const isAuthenticated = await AdminAuth.init();

            if (isAuthenticated) {
                console.log('Admin authenticated successfully');
                loadDashboard();
            } else {
                console.log('Admin authentication failed');
                // Don't redirect immediately - AdminAuth handles it
            }
        } else {
            console.error('AdminAuth system not available');
        }
    } catch (error) {
        console.error('Error initializing admin auth:', error);
    }
});

// Switch tabs
function switchTab(tabName, event) {
    // Remove active from all tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active from all content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // Add active to selected tab
    if (event && event.target) {
        event.target.classList.add('active');
    }

    // Show selected content
    document.getElementById(`${tabName}Tab`).classList.add('active');

    // Load content for the tab
    switch(tabName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'conferences':
            loadConferences();
            break;
        case 'coupons':
            loadCoupons();
            break;
        case 'users':
            // Use simple user manager
            if (window.SimpleUserManager) {
                SimpleUserManager.loadUsers();
            } else {
                loadUsers();
            }
            break;
    }
}

// Load dashboard statistics
async function loadDashboard() {
    try {
        // Get users count
        const usersSnapshot = await database.ref('users').once('value');
        const users = usersSnapshot.val() || {};
        const usersList = Object.values(users);

        document.getElementById('totalUsers').textContent = usersList.length;
        document.getElementById('activeUsers').textContent =
            usersList.filter(u => u.accessGranted).length;

        // Get conferences count
        const conferencesSnapshot = await database.ref('conferences').once('value');
        const conferences = conferencesSnapshot.val() || {};
        document.getElementById('totalConferences').textContent =
            Object.keys(conferences).length;

        // Get coupons count
        const couponsSnapshot = await database.ref('coupons').once('value');
        const coupons = couponsSnapshot.val() || {};
        document.getElementById('totalCoupons').textContent =
            Object.values(coupons).filter(c => c.active).length;

        // Load recent activity
        loadRecentActivity();

    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Load recent activity
async function loadRecentActivity() {
    const activityDiv = document.getElementById('recentActivity');

    try {
        const usersSnapshot = await database.ref('users')
            .orderByChild('createdAt')
            .limitToLast(5)
            .once('value');

        const users = [];
        usersSnapshot.forEach(child => {
            users.push({ ...child.val(), key: child.key });
        });

        if (users.length > 0) {
            let html = '<ul style="list-style: none; padding: 0;">';
            users.reverse().forEach(user => {
                const date = user.createdAt ?
                    new Date(user.createdAt).toLocaleDateString() : 'Fecha desconocida';
                const accessType = user.accessType || 'Sin acceso';
                html += `
                    <li style="padding: 10px 0; border-bottom: 1px solid var(--gray-light);">
                        <strong>${user.email}</strong><br>
                        <small>Registrado: ${date} | Tipo: ${accessType}</small>
                    </li>
                `;
            });
            html += '</ul>';
            activityDiv.innerHTML = html;
        } else {
            activityDiv.innerHTML = '<p class="text-muted">No hay actividad reciente</p>';
        }
    } catch (error) {
        console.error('Error loading activity:', error);
        activityDiv.innerHTML = '<p class="text-muted">Error al cargar actividad</p>';
    }
}

// Fetch Vimeo info using oEmbed API (best practice)
async function fetchVimeoInfo() {
    const vimeoUrl = document.getElementById('vimeoUrl').value.trim();

    if (!vimeoUrl) {
        alert('Por favor ingresa la URL del video de Vimeo');
        return;
    }

    // Show loading state
    const previewDiv = document.getElementById('vimeoPreview');
    if (previewDiv) {
        previewDiv.style.display = 'block';
        previewDiv.innerHTML = '<p style="color: #666;"><i class="fas fa-spinner fa-spin"></i> Obteniendo información del video...</p>';
    }

    try {
        // Clean the URL - accept both vimeo.com and player.vimeo.com formats
        let cleanUrl = vimeoUrl;

        // Remove tracking parameters like ?share=copy
        cleanUrl = cleanUrl.split('?')[0];

        // Convert player.vimeo.com URLs to standard vimeo.com URLs
        if (cleanUrl.includes('player.vimeo.com')) {
            const match = cleanUrl.match(/player\.vimeo\.com\/video\/(\d+)/);
            if (match) {
                cleanUrl = `https://vimeo.com/${match[1]}`;
                // Preserve hash for unlisted videos
                const hashMatch = vimeoUrl.match(/\/(\w+)$/);
                if (hashMatch && hashMatch[1].length > 10) {
                    cleanUrl += `/${hashMatch[1]}`;
                }
            }
        }

        // Extract video ID and hash
        const vimeoMatch = cleanUrl.match(/vimeo\.com\/(\d+)(?:\/(\w+))?/);
        if (!vimeoMatch) {
            alert('URL de Vimeo inválida. Usa formato: https://vimeo.com/123456789');
            return;
        }

        const videoId = vimeoMatch[1];
        const hash = vimeoMatch[2] || '';

        // Use Vimeo oEmbed API
        const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(cleanUrl)}&width=1920`;

        // Fetch video info from Vimeo oEmbed API
        const response = await fetch(oembedUrl);

        if (!response.ok) {
            if (response.status === 403) {
                alert('El video es privado. Configúralo como "Unlisted" en Vimeo para poder usarlo.');
            } else if (response.status === 404) {
                alert('Video no encontrado. Verifica que la URL sea correcta y el video exista.');
            } else {
                alert('Error al obtener información del video. Verifica la URL.');
            }
            previewDiv.style.display = 'none';
            return;
        }

        const data = await response.json();
        console.log('Vimeo oEmbed response:', data);

        // Fill form fields with clean Vimeo URL
        document.getElementById('conferenceVideoUrl').value = cleanUrl;
        document.getElementById('conferenceVideoId').value = videoId;

        // Auto-fill title if not already filled
        if (data.title && !document.getElementById('conferenceTitle').value) {
            document.getElementById('conferenceTitle').value = data.title;
        }

        // Auto-fill speaker/author if available
        if (data.author_name && !document.getElementById('conferenceSpeaker').value) {
            document.getElementById('conferenceSpeaker').value = data.author_name;
        }

        // Set thumbnail
        if (data.thumbnail_url) {
            document.getElementById('conferenceThumbnail').value = data.thumbnail_url;
        }

        // Auto-fill duration if available (convert from seconds to minutes)
        if (data.duration && !document.getElementById('conferenceDuration').value) {
            document.getElementById('conferenceDuration').value = Math.ceil(data.duration / 60);
        }

        // Show preview with thumbnail
        if (previewDiv) {
            previewDiv.innerHTML = `
                <p style="color: var(--success);"><i class="fas fa-check-circle"></i> Información obtenida correctamente</p>
                ${data.thumbnail_url ? `<img id="vimeoThumbPreview" src="${data.thumbnail_url}" style="max-width: 200px; border-radius: var(--radius-sm);" />` : ''}
                <p style="font-size: 12px; margin-top: 10px;">
                    <strong>Título:</strong> ${data.title}<br>
                    <strong>Autor:</strong> ${data.author_name}<br>
                    <strong>Duración:</strong> ${Math.ceil(data.duration / 60)} minutos
                </p>
            `;
        }

        console.log('Vimeo data processed:', {
            videoId,
            hash,
            title: data.title,
            author: data.author_name,
            duration: data.duration,
            thumbnail: data.thumbnail_url
        });

        alert('¡Información del video obtenida correctamente! Completa cualquier campo restante y sube la conferencia.');

    } catch (error) {
        console.error('Error fetching Vimeo info:', error);
        alert('Error al obtener información del video. Por favor verifica la URL.');
        if (previewDiv) {
            previewDiv.style.display = 'none';
        }
    }
}

// Keep backward compatibility
function extractVimeoData() {
    console.warn('extractVimeoData is deprecated. Use fetchVimeoInfo instead.');
    fetchVimeoInfo();
}

// Upload conference
async function uploadConference(event) {
    event.preventDefault();

    const title = document.getElementById('conferenceTitle').value;
    const speaker = document.getElementById('conferenceSpeaker').value;
    const description = document.getElementById('conferenceDescription').value;
    const duration = parseInt(document.getElementById('conferenceDuration').value);
    const videoUrl = document.getElementById('conferenceVideoUrl').value;
    const thumbnail = document.getElementById('conferenceThumbnail').value;
    const videoId = document.getElementById('conferenceVideoId')?.value || '';
    const embedCode = document.getElementById('conferenceEmbedCode')?.value || '';
    const order = parseInt(document.getElementById('conferenceOrder').value) || 0;
    const active = document.getElementById('conferenceActive').checked;

    try {
        // Generate conference ID
        const conferenceId = database.ref('conferences').push().key;

        // Create conference object
        const conferenceData = {
            id: conferenceId,
            title: title,
            speaker: speaker,
            description: description,
            duration: duration,
            videoUrl: videoUrl,
            videoId: videoId || null,
            embedCode: embedCode || null, // Store full embed code for private videos
            thumbnail: thumbnail || null,
            order: order,
            active: active,
            platform: videoUrl.includes('vimeo') ? 'vimeo' : videoUrl.includes('youtube') ? 'youtube' : 'other',
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            views: 0
        };

        // Save to database
        await database.ref(`conferences/${conferenceId}`).set(conferenceData);

        alert('¡Conferencia subida exitosamente!');

        // Reset form
        document.getElementById('conferenceUploadForm').reset();

        // Reload conferences list
        loadConferences();

    } catch (error) {
        console.error('Error uploading conference:', error);
        alert('Error al subir la conferencia: ' + error.message);
    }
}

// Load conferences
async function loadConferences() {
    const listDiv = document.getElementById('conferencesList');

    try {
        const snapshot = await database.ref('conferences')
            .orderByChild('order')
            .once('value');

        const conferences = [];
        snapshot.forEach(child => {
            conferences.push({ ...child.val(), key: child.key });
        });

        if (conferences.length > 0) {
            let html = '';
            conferences.forEach(conf => {
                const statusBadge = conf.active ?
                    '<span class="badge badge-success">Activa</span>' :
                    '<span class="badge badge-warning">Inactiva</span>';

                html += `
                    <div class="conference-item">
                        <div class="conference-info">
                            <div class="conference-title">${conf.title}</div>
                            <div class="conference-meta">
                                Ponente: ${conf.speaker} |
                                Duración: ${conf.duration} min |
                                Orden: ${conf.order} |
                                Vistas: ${conf.views || 0}
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            ${statusBadge}
                            <div class="conference-actions">
                                <button class="btn btn-sm btn-secondary"
                                        onclick="editConference('${conf.key}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-danger"
                                        onclick="deleteConference('${conf.key}', '${conf.title}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            listDiv.innerHTML = html;
        } else {
            listDiv.innerHTML = '<p class="text-muted">No hay conferencias aún</p>';
        }
    } catch (error) {
        console.error('Error loading conferences:', error);
        listDiv.innerHTML = '<p class="text-muted">Error al cargar conferencias</p>';
    }
}

// Edit conference
async function editConference(conferenceId) {
    try {
        const snapshot = await database.ref(`conferences/${conferenceId}`).once('value');
        const conf = snapshot.val();

        if (conf) {
            document.getElementById('editConferenceId').value = conferenceId;
            document.getElementById('editTitle').value = conf.title;
            document.getElementById('editSpeaker').value = conf.speaker;
            document.getElementById('editDescription').value = conf.description;
            document.getElementById('editDuration').value = conf.duration;
            document.getElementById('editVideoUrl').value = conf.videoUrl;
            document.getElementById('editOrder').value = conf.order;
            document.getElementById('editActive').checked = conf.active;

            document.getElementById('editConferenceModal').classList.add('active');
        }
    } catch (error) {
        console.error('Error loading conference:', error);
        alert('Error al cargar la conferencia');
    }
}

// Update conference
async function updateConference(event) {
    event.preventDefault();

    const conferenceId = document.getElementById('editConferenceId').value;
    const updates = {
        title: document.getElementById('editTitle').value,
        speaker: document.getElementById('editSpeaker').value,
        description: document.getElementById('editDescription').value,
        duration: parseInt(document.getElementById('editDuration').value),
        videoUrl: document.getElementById('editVideoUrl').value,
        order: parseInt(document.getElementById('editOrder').value),
        active: document.getElementById('editActive').checked,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };

    try {
        await database.ref(`conferences/${conferenceId}`).update(updates);
        alert('Conferencia actualizada exitosamente');
        closeModal('editConferenceModal');
        loadConferences();
    } catch (error) {
        console.error('Error updating conference:', error);
        alert('Error al actualizar la conferencia');
    }
}

// Delete conference
async function deleteConference(conferenceId, title) {
    if (confirm(`¿Estás seguro de eliminar la conferencia "${title}"?`)) {
        try {
            await database.ref(`conferences/${conferenceId}`).remove();
            alert('Conferencia eliminada exitosamente');
            loadConferences();
        } catch (error) {
            console.error('Error deleting conference:', error);
            alert('Error al eliminar la conferencia');
        }
    }
}

// Create coupon
async function createCoupon(event) {
    event.preventDefault();

    const code = document.getElementById('couponCode').value.toUpperCase();
    const maxUses = parseInt(document.getElementById('couponMaxUses').value);
    const description = document.getElementById('couponDescription').value;

    try {
        const couponData = {
            active: true,
            maxUses: maxUses,
            usedCount: 0,
            description: description || '',
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };

        await database.ref(`coupons/${code}`).set(couponData);
        alert(`Cupón ${code} creado exitosamente`);

        document.getElementById('couponForm').reset();
        loadCoupons();

    } catch (error) {
        console.error('Error creating coupon:', error);
        alert('Error al crear el cupón');
    }
}

// Load coupons
async function loadCoupons() {
    const listDiv = document.getElementById('couponsList');

    try {
        const snapshot = await database.ref('coupons').once('value');
        const coupons = snapshot.val() || {};

        if (Object.keys(coupons).length > 0) {
            let html = '<div style="overflow-x: auto;"><table class="user-table"><thead><tr>';
            html += '<th>Código</th><th>Estado</th><th>Usos</th><th>Descripción</th><th>Acciones</th>';
            html += '</tr></thead><tbody>';

            for (const [code, data] of Object.entries(coupons)) {
                const statusBadge = data.active ?
                    '<span class="badge badge-success">Activo</span>' :
                    '<span class="badge badge-warning">Inactivo</span>';

                const usage = `${data.usedCount || 0} / ${data.maxUses}`;

                html += `
                    <tr>
                        <td><strong>${code}</strong></td>
                        <td>${statusBadge}</td>
                        <td>${usage}</td>
                        <td>${data.description || '-'}</td>
                        <td>
                            <button class="btn btn-sm btn-secondary"
                                    onclick="toggleCoupon('${code}', ${!data.active})">
                                ${data.active ? 'Desactivar' : 'Activar'}
                            </button>
                            <button class="btn btn-sm btn-danger"
                                    onclick="deleteCoupon('${code}')">
                                Eliminar
                            </button>
                        </td>
                    </tr>
                `;
            }

            html += '</tbody></table></div>';
            listDiv.innerHTML = html;
        } else {
            listDiv.innerHTML = '<p class="text-muted">No hay cupones creados</p>';
        }
    } catch (error) {
        console.error('Error loading coupons:', error);
        listDiv.innerHTML = '<p class="text-muted">Error al cargar cupones</p>';
    }
}

// Toggle coupon status
async function toggleCoupon(code, activate) {
    try {
        await database.ref(`coupons/${code}`).update({ active: activate });
        alert(`Cupón ${code} ${activate ? 'activado' : 'desactivado'}`);
        loadCoupons();
    } catch (error) {
        console.error('Error toggling coupon:', error);
        alert('Error al actualizar el cupón');
    }
}

// Delete coupon
async function deleteCoupon(code) {
    if (confirm(`¿Estás seguro de eliminar el cupón ${code}?`)) {
        try {
            await database.ref(`coupons/${code}`).remove();
            alert('Cupón eliminado exitosamente');
            loadCoupons();
        } catch (error) {
            console.error('Error deleting coupon:', error);
            alert('Error al eliminar el cupón');
        }
    }
}

// Load users
async function loadUsers() {
    const listDiv = document.getElementById('usersList');

    try {
        const snapshot = await database.ref('users').once('value');
        const users = snapshot.val() || {};

        if (Object.keys(users).length > 0) {
            let html = '<div style="overflow-x: auto;"><table class="user-table"><thead><tr>';
            html += '<th>Email</th><th>Nombre</th><th>Acceso</th><th>Tipo</th><th>Registro</th><th>Acciones</th>';
            html += '</tr></thead><tbody>';

            for (const [key, user] of Object.entries(users)) {
                const accessBadge = user.accessGranted ?
                    '<span class="badge badge-success">Sí</span>' :
                    '<span class="badge badge-warning">No</span>';

                const typeBadge = user.accessType ?
                    `<span class="badge badge-info">${user.accessType}</span>` : '-';

                const date = user.createdAt ?
                    new Date(user.createdAt).toLocaleDateString() : '-';

                html += `
                    <tr>
                        <td>${user.email || key.replace(/_/g, '.')}</td>
                        <td>${user.name || '-'}</td>
                        <td>${accessBadge}</td>
                        <td>${typeBadge}</td>
                        <td>${date}</td>
                        <td>
                            <button class="btn btn-sm btn-primary"
                                    onclick="toggleUserAccess('${key}', ${!user.accessGranted})">
                                ${user.accessGranted ? 'Revocar' : 'Otorgar'} Acceso
                            </button>
                        </td>
                    </tr>
                `;
            }

            html += '</tbody></table></div>';
            listDiv.innerHTML = html;
        } else {
            listDiv.innerHTML = '<p class="text-muted">No hay usuarios registrados</p>';
        }
    } catch (error) {
        console.error('Error loading users:', error);
        listDiv.innerHTML = '<p class="text-muted">Error al cargar usuarios</p>';
    }
}

// Toggle user access
async function toggleUserAccess(userKey, grant) {
    try {
        const updates = {
            accessGranted: grant
        };

        if (grant) {
            updates.accessType = 'admin-granted';
            updates.grantedAt = firebase.database.ServerValue.TIMESTAMP;
        }

        await database.ref(`users/${userKey}`).update(updates);
        alert(`Acceso ${grant ? 'otorgado' : 'revocado'} exitosamente`);
        loadUsers();
        loadDashboard(); // Update stats
    } catch (error) {
        console.error('Error updating user access:', error);
        alert('Error al actualizar el acceso del usuario');
    }
}

// Search users
function searchUsers() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#usersList tbody tr');

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Sign out
async function signOut() {
    // Use the improved AdminAuth signOut
    if (window.AdminAuth) {
        await AdminAuth.signOut();
    } else {
        // Fallback
        try {
            await auth.signOut();
            sessionStorage.clear();
            window.location.href = '/admin-login.html';
        } catch (error) {
            console.error('Error signing out:', error);
            alert('Error al cerrar sesión');
        }
    }
}