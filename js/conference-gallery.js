// Conference Gallery System - Netflix Style
// LCK Experience Digital

// Initialize Firebase services
const auth = firebase.auth();
const database = firebase.database();
const analytics = firebase.analytics();

// Global state
let currentUser = null;
let conferences = [];
let selectedConference = null;
let userProgress = {};
let isLoading = false;
let connectionRetries = 0;
const MAX_RETRIES = 3;

// Initialize the system
document.addEventListener('DOMContentLoaded', async () => {
    // Show loading
    showLoading();

    // Wait for auth with better connection handling
    await waitForAuthWithRetry();
});

// Wait for auth with retry logic for poor connections
async function waitForAuthWithRetry() {
    try {
        // Don't redirect immediately - wait for auth state
        const authPromise = new Promise((resolve) => {
            let resolved = false;

            // Set a longer timeout for poor connections
            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    resolve(null);
                }
            }, 15000); // 15 seconds timeout

            const unsubscribe = auth.onAuthStateChanged((user) => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    unsubscribe();
                    resolve(user);
                }
            });
        });

        const user = await authPromise;

        if (user) {
            await handleAuthenticated(user);
        } else if (connectionRetries < MAX_RETRIES) {
            connectionRetries++;
            console.log(`Auth attempt ${connectionRetries}/${MAX_RETRIES}`);
            // Try again
            setTimeout(() => waitForAuthWithRetry(), 2000);
        } else {
            // Only redirect after all retries failed
            console.log('No auth after retries, redirecting...');
            window.location.href = '/index.html';
        }
    } catch (error) {
        console.error('Auth error:', error);
        if (connectionRetries < MAX_RETRIES) {
            connectionRetries++;
            setTimeout(() => waitForAuthWithRetry(), 2000);
        }
    }
}

// Handle authenticated user
async function handleAuthenticated(user) {
    currentUser = user;
    console.log('User authenticated:', user.email);

    // Update UI
    updateUserInfo(user);

    // Check access
    const hasAccess = await checkUserAccess(user);
    if (!hasAccess) {
        showAccessDenied();
        return;
    }

    // Load conferences and progress
    await Promise.all([
        loadConferences(),
        loadUserProgress(user)
    ]);

    // Render gallery
    renderGallery();

    // Hide loading
    hideLoading();

    // Keep session alive
    startSessionMaintenance();
}

// Check user access
async function checkUserAccess(user) {
    try {
        const userRef = database.ref(`users/${user.email.replace(/\./g, '_')}`);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val();

        // Check multiple access conditions
        const hasAccess = userData && (
            userData.accessGranted === true ||  // General access
            userData.hasPaid === true ||        // Has paid through Stripe
            userData.accessType === 'coupon' || // Has coupon access
            userData.accessType === 'paid' ||   // Marked as paid
            userData.accessType === 'admin'     // Admin granted access
        );

        console.log('Access check for', user.email, ':', {
            accessGranted: userData?.accessGranted,
            hasPaid: userData?.hasPaid,
            accessType: userData?.accessType,
            hasAccess: hasAccess
        });

        return hasAccess;
    } catch (error) {
        console.error('Error checking access:', error);
        // On error, check if user is logged in and has email verified
        return user && user.emailVerified;
    }
}

// Load conferences from Firebase
async function loadConferences() {
    try {
        const snapshot = await database.ref('conferences')
            .orderByChild('order')
            .once('value');

        conferences = [];
        snapshot.forEach(child => {
            const conf = child.val();
            if (conf.active) {
                conferences.push({
                    ...conf,
                    id: child.key
                });
            }
        });

        conferences.sort((a, b) => (a.order || 0) - (b.order || 0));
        console.log(`Loaded ${conferences.length} conferences`);
    } catch (error) {
        console.error('Error loading conferences:', error);
        conferences = [];
    }
}

// Load user progress
async function loadUserProgress(user) {
    try {
        const snapshot = await database.ref(`userProgress/${user.uid}`).once('value');
        userProgress = snapshot.val() || {};
    } catch (error) {
        console.error('Error loading progress:', error);
        userProgress = {};
    }
}

// Render Netflix-style gallery
function renderGallery() {
    const container = document.getElementById('conferenceGallery');
    if (!container) return;

    if (conferences.length === 0) {
        container.innerHTML = `
            <div class="no-conferences">
                <i class="fas fa-video-slash"></i>
                <h2>No hay conferencias disponibles</h2>
                <p>Las conferencias se están preparando y estarán disponibles pronto.</p>
            </div>
        `;
        return;
    }

    // Create gallery grid
    let html = '<div class="conferences-grid">';

    conferences.forEach(conference => {
        const progress = userProgress.conferences?.[conference.id];
        const isCompleted = progress?.completed;
        const isInProgress = progress?.watched && !isCompleted;
        const progressPercent = calculateProgress(conference, progress);

        html += `
            <div class="conference-card" onclick="playConference('${conference.id}')">
                <div class="conference-thumbnail">
                    ${conference.thumbnail ?
                        `<img src="${conference.thumbnail}" alt="${conference.title}">` :
                        `<div class="thumbnail-placeholder">
                            <i class="fas fa-play-circle"></i>
                        </div>`
                    }
                    <div class="play-overlay">
                        <i class="fas fa-play"></i>
                    </div>
                    ${isCompleted ? '<div class="completed-badge"><i class="fas fa-check"></i></div>' : ''}
                    ${isInProgress ? `
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                    ` : ''}
                </div>
                <div class="conference-info">
                    <h3>${conference.title}</h3>
                    <p class="speaker">${conference.speaker}</p>
                    <p class="duration">${conference.duration || 0} minutos</p>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// Calculate progress percentage
function calculateProgress(conference, progress) {
    if (!progress || !progress.currentTime || !conference.duration) return 0;
    return Math.min(100, (progress.currentTime / (conference.duration * 60)) * 100);
}

// Play selected conference
window.playConference = async function(conferenceId) {
    const conference = conferences.find(c => c.id === conferenceId);
    if (!conference) return;

    selectedConference = conference;

    // Show video player modal
    showVideoPlayer(conference);

    // Track view
    trackView(conference);
}

// Show video player
function showVideoPlayer(conference) {
    const modal = document.getElementById('videoModal') || createVideoModal();
    const videoContainer = document.getElementById('modalVideoContainer');
    const videoInfo = document.getElementById('modalVideoInfo');

    // Add ESC key listener
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeVideoModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);

    // Parse video URL
    const videoData = parseVideoUrl(conference.videoUrl);

    if (videoData) {
        if (videoData.type === 'youtube' || videoData.type === 'vimeo' || videoData.type === 'googledrive') {
            // Use iframe for embedded videos
            videoContainer.innerHTML = `
                <iframe
                    src="${videoData.embedUrl}"
                    frameborder="0"
                    allowfullscreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen">
                </iframe>
            `;

            // Add mark as completed button for embedded videos
            if (!videoInfo.querySelector('.mark-complete-btn')) {
                const completeBtn = document.createElement('button');
                completeBtn.className = 'btn btn-primary mark-complete-btn';
                completeBtn.innerHTML = '<i class="fas fa-check"></i> Marcar como completada';
                completeBtn.style.cssText = 'margin-top: 15px; background: var(--accent-gold); border: none; padding: 10px 20px; border-radius: 5px; color: white; cursor: pointer; font-weight: 500;';
                completeBtn.onclick = () => {
                    handleVideoEnded(conference);
                    setTimeout(() => closeVideoModal(), 1500);
                };
                videoInfo.appendChild(completeBtn);
            }
        } else {
            // Use HTML5 video for direct files
            videoContainer.innerHTML = `
                <video id="conferenceVideo" controls controlsList="nodownload">
                    <source src="${videoData.embedUrl}" type="video/mp4">
                    Tu navegador no soporta el elemento de video.
                </video>
            `;

            // Setup video tracking
            const video = document.getElementById('conferenceVideo');
            setupVideoTracking(video, conference);
        }
    } else {
        videoContainer.innerHTML = `
            <div class="video-error">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Video no disponible</h3>
                <p>El video de esta conferencia aún no está disponible.</p>
            </div>
        `;
    }

    // Update info
    videoInfo.innerHTML = `
        <h2>${conference.title}</h2>
        <p class="video-speaker"><i class="fas fa-user"></i> ${conference.speaker}</p>
        <p class="video-duration"><i class="fas fa-clock"></i> ${conference.duration || 0} minutos</p>
        ${conference.description ? `<p class="video-description">${conference.description}</p>` : ''}
    `;

    // Show modal
    modal.classList.add('active');

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
}

// Create video modal if doesn't exist
function createVideoModal() {
    const modal = document.createElement('div');
    modal.id = 'videoModal';
    modal.className = 'video-modal';
    modal.innerHTML = `
        <button class="back-to-gallery" onclick="closeVideoModal()">
            <i class="fas fa-arrow-left"></i>
            Volver a Galería
        </button>
        <button class="modal-close" onclick="closeVideoModal()" title="Cerrar (ESC)">
            <i class="fas fa-times"></i>
        </button>
        <div class="modal-content" onclick="event.stopPropagation()">
            <div id="modalVideoContainer" class="modal-video-container"></div>
            <div id="modalVideoInfo" class="modal-video-info"></div>
        </div>
        <div class="close-hint">Presiona ESC o haz clic fuera para cerrar</div>
    `;

    // Click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeVideoModal();
        }
    });

    document.body.appendChild(modal);
    return modal;
}

// Close video modal
window.closeVideoModal = function() {
    const modal = document.getElementById('videoModal');
    if (modal) {
        // Save progress if video
        const video = document.getElementById('conferenceVideo');
        if (video && selectedConference) {
            saveProgress(selectedConference.id, {
                watched: true,
                currentTime: video.currentTime,
                completed: video.ended
            });
        }

        // Remove active class with animation
        modal.classList.remove('active');

        // Re-enable body scroll
        document.body.style.overflow = '';

        // Clean up after animation
        setTimeout(() => {
            const container = document.getElementById('modalVideoContainer');
            if (container) container.innerHTML = '';

            // Remove ESC listener if exists
            document.removeEventListener('keydown', window.currentEscapeHandler);
        }, 300);

        // Refresh gallery to show updated progress
        renderGallery();
    }
}

// Parse video URL
function parseVideoUrl(url) {
    if (!url) return null;

    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    if (youtubeMatch) {
        return {
            type: 'youtube',
            id: youtubeMatch[1],
            embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}?rel=0&modestbranding=1`
        };
    }

    // Vimeo - Handle standard URLs and unlisted URLs with hash
    const vimeoStandardMatch = url.match(/vimeo\.com\/(\d+)(?:\/(\w+))?/);
    if (vimeoStandardMatch) {
        const videoId = vimeoStandardMatch[1];
        const hash = vimeoStandardMatch[2];

        // For unlisted videos with hash, include the hash in the player URL
        let embedUrl;
        if (hash) {
            // Include hash for unlisted videos
            embedUrl = `https://player.vimeo.com/video/${videoId}?h=${hash}`;
        } else {
            // Regular video without hash
            embedUrl = `https://player.vimeo.com/video/${videoId}`;
        }

        return {
            type: 'vimeo',
            id: videoId,
            embedUrl: embedUrl,
            hash: hash || null
        };
    }

    // Legacy: Handle player.vimeo.com URLs (may include hash)
    const vimeoPlayerMatch = url.match(/player\.vimeo\.com\/video\/(\d+)(?:\?h=([a-zA-Z0-9]+))?/);
    if (vimeoPlayerMatch) {
        const videoId = vimeoPlayerMatch[1];
        const hash = vimeoPlayerMatch[2];

        let embedUrl;
        if (hash) {
            embedUrl = `https://player.vimeo.com/video/${videoId}?h=${hash}`;
        } else {
            embedUrl = `https://player.vimeo.com/video/${videoId}`;
        }

        return {
            type: 'vimeo',
            id: videoId,
            embedUrl: embedUrl,
            hash: hash || null
        };
    }

    // Google Drive
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
    if (driveMatch) {
        return {
            type: 'googledrive',
            id: driveMatch[1],
            embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview`
        };
    }

    // Direct video
    if (url.match(/\.(mp4|webm|ogg)$/i)) {
        return {
            type: 'direct',
            embedUrl: url
        };
    }

    return null;
}

// Setup video tracking for HTML5 videos
function setupVideoTracking(video, conference) {
    // Resume from saved position
    const progress = userProgress.conferences?.[conference.id];
    if (progress && progress.currentTime > 0 && !progress.completed) {
        video.currentTime = progress.currentTime;
    }

    // Track events
    video.addEventListener('play', () => trackEvent('play', conference));
    video.addEventListener('pause', () => trackEvent('pause', conference));
    video.addEventListener('ended', () => handleVideoEnded(conference));

    // Save progress periodically
    let progressInterval = setInterval(() => {
        if (video && !video.paused) {
            saveProgress(conference.id, {
                watched: true,
                currentTime: video.currentTime,
                completed: false
            });
        }
    }, 10000); // Every 10 seconds

    // Clear interval when video is removed
    video.addEventListener('beforeunload', () => clearInterval(progressInterval));
}

// Handle video ended
async function handleVideoEnded(conference) {
    await saveProgress(conference.id, {
        watched: true,
        currentTime: 0,
        completed: true
    });

    // Update view count
    await incrementViewCount(conference.id);

    // Refresh gallery to show completion
    renderGallery();

    // Show completion message
    showToast('¡Conferencia completada! 🎉');
}

// Save progress
async function saveProgress(conferenceId, progress) {
    if (!currentUser) return;

    try {
        await database.ref(`userProgress/${currentUser.uid}/conferences/${conferenceId}`).update({
            ...progress,
            lastWatched: Date.now()
        });

        // Update local progress
        if (!userProgress.conferences) userProgress.conferences = {};
        userProgress.conferences[conferenceId] = { ...userProgress.conferences[conferenceId], ...progress };

    } catch (error) {
        console.error('Error saving progress:', error);
        // Don't throw - silent fail for progress saving
    }
}

// Track view
async function trackView(conference) {
    try {
        analytics.logEvent('conference_view', {
            conference_id: conference.id,
            conference_title: conference.title,
            user_email: currentUser.email
        });

        await incrementViewCount(conference.id);
    } catch (error) {
        console.error('Error tracking view:', error);
    }
}

// Track event
function trackEvent(event, conference) {
    analytics.logEvent(`video_${event}`, {
        conference_id: conference.id,
        conference_title: conference.title,
        user_email: currentUser.email
    });
}

// Increment view count
async function incrementViewCount(conferenceId) {
    try {
        await database.ref(`conferences/${conferenceId}/views`).transaction(views => (views || 0) + 1);
    } catch (error) {
        console.error('Error incrementing views:', error);
    }
}

// Update user info
function updateUserInfo(user) {
    const emailElement = document.getElementById('userEmail');
    if (emailElement) {
        emailElement.textContent = user.email;
    }
}

// Session maintenance
function startSessionMaintenance() {
    // Only refresh token when needed, not on a timer
    auth.currentUser?.getIdToken(false).catch(console.error);

    // Monitor online/offline status
    window.addEventListener('online', () => {
        console.log('Connection restored');
        if (!currentUser) {
            waitForAuthWithRetry();
        }
    });

    window.addEventListener('offline', () => {
        console.log('Connection lost - maintaining session');
        // Don't sign out on connection loss
    });
}

// Show loading
function showLoading() {
    const container = document.getElementById('conferenceGallery');
    if (container) {
        container.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <h2>Cargando conferencias...</h2>
            </div>
        `;
    }
}

// Hide loading
function hideLoading() {
    // Gallery will replace loading when rendered
}

// Show access denied
function showAccessDenied() {
    const container = document.getElementById('conferenceGallery');
    if (container) {
        container.innerHTML = `
            <div class="access-denied">
                <i class="fas fa-lock"></i>
                <h2>Acceso Denegado</h2>
                <p>No tienes acceso a las conferencias.</p>
                <a href="/index.html" class="btn btn-primary">Obtener Acceso</a>
            </div>
        `;
    }
}

// Show toast notification
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Sign out
window.signOut = async function() {
    try {
        // Save any progress
        const video = document.getElementById('conferenceVideo');
        if (video && selectedConference) {
            await saveProgress(selectedConference.id, {
                currentTime: video.currentTime
            });
        }

        await auth.signOut();
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = '/index.html';

    } catch (error) {
        console.error('Error signing out:', error);
    }
}