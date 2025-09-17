// Conference System - Complete Solution with Video Embedding
// LCK Experience Digital

// Initialize Firebase services
const auth = firebase.auth();
const database = firebase.database();
const analytics = firebase.analytics();

// Global state
let currentUser = null;
let conferences = [];
let currentConferenceIndex = 0;
let userProgress = {};
let sessionCheckInterval = null;
let tokenRefreshInterval = null;
let authInitialized = false;

// Wait for auth to be ready before checking
async function initializeAuth() {
    if (authInitialized) return;
    authInitialized = true;

    // Use AuthManager if available
    if (window.AuthManager) {
        const user = await AuthManager.waitForAuth(10000);
        if (user) {
            await handleUserAuthenticated(user);
        } else {
            // Only redirect if truly no user after waiting
            console.log('No user authenticated after waiting');
            window.location.href = '/index.html';
        }
    } else {
        // Fallback to direct auth monitoring
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                await handleUserAuthenticated(user);
            } else {
                // Wait longer before redirecting
                setTimeout(() => {
                    if (!auth.currentUser) {
                        console.log('No user authenticated - redirecting to login');
                        window.location.href = '/index.html';
                    }
                }, 5000); // Wait 5 seconds instead of 2
            }
        });
    }
}

// Handle authenticated user
async function handleUserAuthenticated(user) {

    currentUser = user;
    console.log('User authenticated:', user.email);

    // Start session maintenance
    startSessionMaintenance();

    // Check if user has access
    const hasAccess = await checkUserAccess(user);

    if (!hasAccess) {
        alert('No tienes acceso a las conferencias. Por favor, compra tu acceso o usa un cupón válido.');
        window.location.href = '/index.html';
        return;
    }

    // Initialize conference system
    await initializeConferenceSystem(user);
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuth);
} else {
    initializeAuth();
}

// Session maintenance to prevent logout
function startSessionMaintenance() {
    // Refresh token every 30 minutes (less aggressive)
    tokenRefreshInterval = setInterval(async () => {
        if (auth.currentUser) {
            try {
                await auth.currentUser.getIdToken(true);
                console.log('Token refreshed at', new Date().toLocaleTimeString());
            } catch (error) {
                console.error('Error refreshing token:', error);
                // Don't sign out on error - token might still be valid
            }
        }
    }, 30 * 60 * 1000); // 30 minutes

    // Keep session alive with less frequent updates
    sessionCheckInterval = setInterval(async () => {
        if (auth.currentUser) {
            // Update last activity in database
            try {
                const sessionRef = database.ref(`activeSessions/${auth.currentUser.uid}`);
                await sessionRef.update({
                    lastActivity: Date.now(),
                    email: auth.currentUser.email
                });
            } catch (error) {
                console.error('Error updating session:', error);
                // Don't sign out on error
            }
        }
    }, 5 * 60 * 1000); // Every 5 minutes instead of every minute
}

// Check if user has access to conferences
async function checkUserAccess(user) {
    try {
        const userRef = database.ref(`users/${user.email.replace(/\./g, '_')}`);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val();

        if (!userData) {
            console.log('No user data found');
            return false;
        }

        console.log('User access status:', userData.accessGranted);
        return userData.accessGranted === true;

    } catch (error) {
        console.error('Error checking user access:', error);
        return false;
    }
}

// Initialize the conference system
async function initializeConferenceSystem(user) {
    try {
        // Show loading state
        showLoadingState();

        // Update user info in header
        updateUserInfo(user);

        // Load conferences from Firebase
        await loadConferences();

        // Load user progress
        await loadUserProgress(user);

        // Initialize UI
        initializeUI();

        // Start first conference or resume where left off
        if (userProgress.lastWatchedId) {
            const index = conferences.findIndex(c => c.id === userProgress.lastWatchedId);
            if (index !== -1) {
                currentConferenceIndex = index;
            }
        }

        // Load the current conference
        if (conferences.length > 0) {
            loadConference(currentConferenceIndex);
        } else {
            showNoConferencesMessage();
        }

        // Hide loading state
        hideLoadingState();

    } catch (error) {
        console.error('Error initializing conference system:', error);
        showErrorMessage('Error al cargar las conferencias. Por favor, recarga la página.');
    }
}

// Load conferences from Firebase
async function loadConferences() {
    try {
        const conferencesRef = database.ref('conferences');
        const snapshot = await conferencesRef
            .orderByChild('order')
            .once('value');

        conferences = [];

        snapshot.forEach(child => {
            const conference = child.val();
            if (conference.active) {
                conferences.push({
                    ...conference,
                    id: child.key
                });
            }
        });

        console.log(`Loaded ${conferences.length} active conferences`);

        // Sort by order
        conferences.sort((a, b) => (a.order || 0) - (b.order || 0));

    } catch (error) {
        console.error('Error loading conferences:', error);
        conferences = [];
    }
}

// Load user progress
async function loadUserProgress(user) {
    try {
        const progressRef = database.ref(`userProgress/${user.uid}`);
        const snapshot = await progressRef.once('value');
        userProgress = snapshot.val() || {};

    } catch (error) {
        console.error('Error loading user progress:', error);
        userProgress = {};
    }
}

// Save user progress
async function saveUserProgress(conferenceId, progress) {
    if (!currentUser) return;

    try {
        const progressRef = database.ref(`userProgress/${currentUser.uid}`);

        await progressRef.update({
            [`conferences/${conferenceId}`]: {
                watched: progress.watched || false,
                currentTime: progress.currentTime || 0,
                lastWatched: Date.now(),
                completed: progress.completed || false
            },
            lastWatchedId: conferenceId,
            lastActivity: Date.now()
        });

    } catch (error) {
        console.error('Error saving progress:', error);
    }
}

// Parse video URL and return embed info
function parseVideoUrl(url) {
    if (!url) return null;

    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    if (youtubeMatch) {
        return {
            type: 'youtube',
            id: youtubeMatch[1],
            embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}?enablejsapi=1&rel=0&modestbranding=1`
        };
    }

    // Vimeo - Handle both regular and embed URLs with privacy hash
    // Check for Vimeo player URL first (from embed)
    const vimeoPlayerMatch = url.match(/player\.vimeo\.com\/video\/(\d+)(?:\?h=([a-zA-Z0-9]+))?/);
    if (vimeoPlayerMatch) {
        const videoId = vimeoPlayerMatch[1];
        const hash = vimeoPlayerMatch[2];
        // Keep the original URL if it has a hash (for private videos)
        if (hash) {
            return {
                type: 'vimeo',
                id: videoId,
                embedUrl: url // Use the full URL with hash for private videos
            };
        } else {
            return {
                type: 'vimeo',
                id: videoId,
                embedUrl: `https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0`
            };
        }
    }

    // Regular Vimeo URL
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
        return {
            type: 'vimeo',
            id: vimeoMatch[1],
            embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?title=0&byline=0&portrait=0`
        };
    }

    // Direct video URL
    if (url.match(/\.(mp4|webm|ogg)$/i)) {
        return {
            type: 'direct',
            embedUrl: url
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

    return null;
}

// Load a specific conference
function loadConference(index) {
    if (index < 0 || index >= conferences.length) {
        console.error('Invalid conference index');
        return;
    }

    const conference = conferences[index];
    currentConferenceIndex = index;

    console.log('Loading conference:', conference.title, 'URL:', conference.videoUrl);

    // Update video player
    const videoContainer = document.getElementById('videoPlayer');
    const videoPlaceholder = document.getElementById('videoPlaceholder');

    // Check if we have a full embed code stored
    let videoInfo = null;
    if (conference.embedCode && conference.embedCode.includes('<iframe')) {
        // Use the stored embed code directly
        videoInfo = { type: 'embed', embedCode: conference.embedCode };
    } else {
        // Parse video URL normally
        videoInfo = parseVideoUrl(conference.videoUrl);
    }

    if (videoInfo) {
        // Hide placeholder
        videoPlaceholder.style.display = 'none';
        videoContainer.style.display = 'block';

        // Clear previous content
        videoContainer.innerHTML = '';

        if (videoInfo.type === 'embed') {
            // Use the full embed code directly
            videoContainer.innerHTML = videoInfo.embedCode;

            // Ensure iframe has proper attributes
            const iframe = videoContainer.querySelector('iframe');
            if (iframe) {
                iframe.width = '100%';
                iframe.height = '100%';
                iframe.style.borderRadius = '8px';
            }

            // Track that video was started
            trackVideoEvent('play', conference);

            // Mark as watched
            saveUserProgress(conference.id, {
                watched: true,
                currentTime: 0,
                completed: false
            });

            // Add manual completion button for embedded videos
            if (!document.getElementById('markCompleteBtn')) {
                const completeBtn = document.createElement('button');
                completeBtn.id = 'markCompleteBtn';
                completeBtn.className = 'btn btn-primary';
                completeBtn.innerHTML = '<i class="fas fa-check"></i> Marcar como completado';
                completeBtn.style.marginTop = '15px';
                completeBtn.onclick = () => {
                    handleVideoEnded(conference);
                };
                videoContainer.parentElement.appendChild(completeBtn);
            }

        } else if (videoInfo.type === 'direct') {
            // Use HTML5 video player for direct videos
            const video = document.createElement('video');
            video.id = 'conferenceStream';
            video.controls = true;
            video.controlsList = 'nodownload';
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'contain';
            video.src = videoInfo.embedUrl;

            // Add event listeners
            video.onplay = () => trackVideoEvent('play', conference);
            video.onpause = () => trackVideoEvent('pause', conference);
            video.onended = () => handleVideoEnded(conference);

            // Resume from saved position
            const savedProgress = userProgress.conferences?.[conference.id];
            if (savedProgress && savedProgress.currentTime > 0 && !savedProgress.completed) {
                video.currentTime = savedProgress.currentTime;
            }

            // Save progress periodically
            video.ontimeupdate = throttle(() => {
                saveUserProgress(conference.id, {
                    watched: true,
                    currentTime: video.currentTime,
                    completed: false
                });
            }, 10000);

            videoContainer.appendChild(video);

        } else {
            // Use iframe for YouTube, Vimeo, Google Drive
            const iframe = document.createElement('iframe');
            iframe.src = videoInfo.embedUrl;
            iframe.width = '100%';
            iframe.height = '100%';
            iframe.frameBorder = '0';
            iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
            iframe.allowFullscreen = true;
            iframe.style.borderRadius = '8px';

            videoContainer.appendChild(iframe);

            // Track that video was started (can't track progress with iframe)
            trackVideoEvent('play', conference);

            // Mark as watched
            saveUserProgress(conference.id, {
                watched: true,
                currentTime: 0,
                completed: false
            });

            // Add manual completion button for embedded videos
            if (!document.getElementById('markCompleteBtn')) {
                const completeBtn = document.createElement('button');
                completeBtn.id = 'markCompleteBtn';
                completeBtn.className = 'btn btn-primary';
                completeBtn.innerHTML = '<i class="fas fa-check"></i> Marcar como completado';
                completeBtn.style.marginTop = '15px';
                completeBtn.onclick = () => {
                    handleVideoEnded(conference);
                };
                videoContainer.parentElement.appendChild(completeBtn);
            }
        }

    } else {
        // No valid video URL - show placeholder
        videoContainer.style.display = 'none';
        videoPlaceholder.style.display = 'flex';
        videoPlaceholder.innerHTML = `
            <div class="placeholder-content">
                <h2>Video No Disponible</h2>
                <p>El video de esta conferencia aún no está disponible.</p>
                <p style="font-size: 0.9em; margin-top: 20px; opacity: 0.7;">
                    URL proporcionada: ${conference.videoUrl || 'Ninguna'}
                </p>
                <p style="font-size: 0.9em; margin-top: 10px; opacity: 0.7;">
                    Por favor, verifica que la URL sea de YouTube, Vimeo o un archivo de video directo.
                </p>
            </div>
        `;
    }

    // Update conference info
    updateConferenceInfo(conference);

    // Update conference list
    updateConferenceList();

    // Update navigation buttons
    updateNavigationButtons();

    // Track view
    trackConferenceView(conference);
}

// Update conference information display
function updateConferenceInfo(conference) {
    const titleElement = document.getElementById('currentTitle');
    const speakerElement = document.getElementById('currentSpeaker');
    const timeElement = document.getElementById('currentTime');

    if (titleElement) titleElement.textContent = conference.title || 'Sin título';
    if (speakerElement) speakerElement.textContent = conference.speaker || 'Ponente';
    if (timeElement) timeElement.textContent = `${conference.duration || 0} min`;

    // Add description if exists
    const existingDesc = document.getElementById('currentDescription');
    if (existingDesc) {
        existingDesc.textContent = conference.description || '';
    } else if (conference.description) {
        const infoContainer = document.querySelector('.current-info');
        if (infoContainer) {
            const descDiv = document.createElement('div');
            descDiv.id = 'currentDescription';
            descDiv.className = 'current-description';
            descDiv.textContent = conference.description;
            infoContainer.appendChild(descDiv);
        }
    }
}

// Update conference list in sidebar
function updateConferenceList() {
    const scheduleList = document.getElementById('scheduleList');
    if (!scheduleList) return;

    scheduleList.innerHTML = '';

    conferences.forEach((conference, index) => {
        const item = document.createElement('div');
        item.className = 'schedule-item';

        // Mark as active if current
        if (index === currentConferenceIndex) {
            item.classList.add('active');
        }

        // Check if watched
        const progress = userProgress.conferences?.[conference.id];
        if (progress?.completed) {
            item.classList.add('completed');
        } else if (progress?.watched) {
            item.classList.add('in-progress');
        }

        item.innerHTML = `
            <div class="conference-number">${index + 1}</div>
            <div class="conference-content">
                <div class="schedule-title">${conference.title}</div>
                <div class="schedule-speaker">${conference.speaker}</div>
                <div class="schedule-duration">${conference.duration || 0} min</div>
                ${progress?.completed ? '<span class="completed-badge">✓ Completado</span>' : ''}
            </div>
        `;

        // Make clickable
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => {
            loadConference(index);
        });

        scheduleList.appendChild(item);
    });
}

// Update navigation buttons
function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevConference');
    const nextBtn = document.getElementById('nextConference');

    if (prevBtn) {
        prevBtn.disabled = currentConferenceIndex === 0;
        prevBtn.onclick = () => {
            if (currentConferenceIndex > 0) {
                loadConference(currentConferenceIndex - 1);
            }
        };
    }

    if (nextBtn) {
        nextBtn.disabled = currentConferenceIndex === conferences.length - 1;
        nextBtn.onclick = () => {
            if (currentConferenceIndex < conferences.length - 1) {
                loadConference(currentConferenceIndex + 1);
            }
        };
    }
}

// Handle video ended
async function handleVideoEnded(conference) {
    // Mark as completed
    await saveUserProgress(conference.id, {
        watched: true,
        currentTime: 0,
        completed: true
    });

    // Update views count
    await incrementViewCount(conference.id);

    // Update UI
    updateConferenceList();

    // Show completion message
    showToast('¡Conferencia completada! 🎉');

    // Auto-play next if available
    if (currentConferenceIndex < conferences.length - 1) {
        setTimeout(() => {
            loadConference(currentConferenceIndex + 1);
        }, 3000);
    } else {
        showCompletionMessage();
    }
}

// Show toast notification
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--accent-gold);
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Track conference view
async function trackConferenceView(conference) {
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

// Increment view count
async function incrementViewCount(conferenceId) {
    try {
        const viewsRef = database.ref(`conferences/${conferenceId}/views`);
        await viewsRef.transaction(currentViews => {
            return (currentViews || 0) + 1;
        });
    } catch (error) {
        console.error('Error incrementing view count:', error);
    }
}

// Track video events
function trackVideoEvent(event, conference) {
    analytics.logEvent(`video_${event}`, {
        conference_id: conference.id,
        conference_title: conference.title,
        user_email: currentUser.email
    });
}

// Update user info
function updateUserInfo(user) {
    const emailElement = document.getElementById('userEmail');
    if (emailElement) {
        emailElement.textContent = user.email;
    }
}

// Show loading state
function showLoadingState() {
    const videoContainer = document.getElementById('videoPlayer');
    const placeholder = document.getElementById('videoPlaceholder');

    if (videoContainer) videoContainer.style.display = 'none';
    if (placeholder) {
        placeholder.style.display = 'flex';
        placeholder.innerHTML = `
            <div class="placeholder-content">
                <div class="loading-spinner"></div>
                <h2>Cargando conferencias...</h2>
                <p>Por favor espera un momento</p>
            </div>
        `;
    }
}

// Hide loading state
function hideLoadingState() {
    // Will be hidden when conference loads
}

// Show no conferences message
function showNoConferencesMessage() {
    const placeholder = document.getElementById('videoPlaceholder');
    if (placeholder) {
        placeholder.style.display = 'flex';
        placeholder.innerHTML = `
            <div class="placeholder-content">
                <h2>No hay conferencias disponibles</h2>
                <p>Las conferencias se están preparando y estarán disponibles pronto.</p>
                <p style="font-size: 0.9em; margin-top: 20px; opacity: 0.7;">
                    Por favor, vuelve más tarde.
                </p>
            </div>
        `;
    }
}

// Show completion message
function showCompletionMessage() {
    const placeholder = document.getElementById('videoPlaceholder');
    const videoContainer = document.getElementById('videoPlayer');

    if (videoContainer) videoContainer.style.display = 'none';
    if (placeholder) {
        placeholder.style.display = 'flex';
        placeholder.innerHTML = `
            <div class="placeholder-content">
                <h2>🎉 ¡Felicidades!</h2>
                <p>Has completado todas las conferencias disponibles.</p>
                <p style="margin-top: 20px;">
                    Gracias por participar en LCK Experience Digital.
                </p>
                <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 20px;">
                    Ver resumen de progreso
                </button>
            </div>
        `;
    }
}

// Show error message
function showErrorMessage(message) {
    const placeholder = document.getElementById('videoPlaceholder');
    if (placeholder) {
        placeholder.style.display = 'flex';
        placeholder.innerHTML = `
            <div class="placeholder-content">
                <h2>Error</h2>
                <p>${message}</p>
                <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 20px;">
                    Recargar Página
                </button>
            </div>
        `;
    }
}

// Initialize UI
function initializeUI() {
    // Initialize tabs
    initializeTabs();

    // Initialize chat
    initializeChat();

    // Add sign out functionality
    const signOutBtn = document.querySelector('.logout-btn');
    if (signOutBtn) {
        signOutBtn.onclick = signOut;
    }

    // Add navigation if doesn't exist
    addNavigationControls();

    // Add styles
    addCustomStyles();
}

// Initialize tabs
function initializeTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;

            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
            const targetPanel = document.getElementById(`${tab}Tab`);
            if (targetPanel) targetPanel.classList.add('active');
        });
    });
}

// Initialize chat
function initializeChat() {
    const chatForm = document.getElementById('chatForm');
    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('chatInput');
            if (input) {
                console.log('Chat message:', input.value);
                input.value = '';
            }
        });
    }
}

// Add navigation controls
function addNavigationControls() {
    const videoSection = document.querySelector('.video-section');
    if (videoSection && !document.getElementById('conferenceNavigation')) {
        const navDiv = document.createElement('div');
        navDiv.id = 'conferenceNavigation';
        navDiv.className = 'conference-navigation';
        navDiv.innerHTML = `
            <button id="prevConference" class="nav-btn">
                <i class="fas fa-chevron-left"></i> Anterior
            </button>
            <button id="nextConference" class="nav-btn">
                Siguiente <i class="fas fa-chevron-right"></i>
            </button>
        `;
        videoSection.appendChild(navDiv);
    }
}

// Add custom styles
function addCustomStyles() {
    if (!document.getElementById('conferenceStyles')) {
        const style = document.createElement('style');
        style.id = 'conferenceStyles';
        style.innerHTML = `
            .loading-spinner {
                border: 4px solid #f3f3f3;
                border-top: 4px solid var(--accent-gold);
                border-radius: 50%;
                width: 50px;
                height: 50px;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }

            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }

            .conference-navigation {
                display: flex;
                justify-content: space-between;
                margin-top: 20px;
                padding: 0 20px;
            }

            .nav-btn {
                padding: 10px 20px;
                background: var(--primary-black);
                color: white;
                border: none;
                border-radius: var(--radius-sm);
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 14px;
                font-weight: 600;
            }

            .nav-btn:hover:not(:disabled) {
                background: var(--accent-gold);
                transform: translateY(-2px);
            }

            .nav-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .schedule-item {
                padding: 15px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 15px;
            }

            .schedule-item:hover {
                background: rgba(255,255,255,0.05);
            }

            .schedule-item.active {
                background: rgba(212, 175, 55, 0.2);
                border-left: 3px solid var(--accent-gold);
            }

            .schedule-item.completed {
                opacity: 0.7;
            }

            .conference-number {
                width: 30px;
                height: 30px;
                background: rgba(255,255,255,0.1);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 14px;
            }

            .conference-content {
                flex: 1;
            }

            .completed-badge {
                color: #4CAF50;
                font-size: 12px;
                margin-left: 10px;
            }

            .current-description {
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid rgba(255,255,255,0.1);
                font-size: 14px;
                opacity: 0.9;
                line-height: 1.6;
            }

            #markCompleteBtn {
                width: 100%;
                background: var(--accent-gold);
                color: white;
                border: none;
                padding: 12px;
                border-radius: var(--radius-sm);
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s ease;
            }

            #markCompleteBtn:hover {
                background: #b8941f;
                transform: translateY(-2px);
            }
        `;
        document.head.appendChild(style);
    }
}

// Sign out function - global
window.signOut = async function() {
    try {
        // Clear intervals
        if (sessionCheckInterval) clearInterval(sessionCheckInterval);
        if (tokenRefreshInterval) clearInterval(tokenRefreshInterval);

        // Save last activity
        if (currentUser && conferences[currentConferenceIndex]) {
            const video = document.getElementById('conferenceStream');
            if (video && video.currentTime) {
                await saveUserProgress(conferences[currentConferenceIndex].id, {
                    currentTime: video.currentTime
                });
            }
        }

        // Sign out from Firebase
        await auth.signOut();

        // Clear session data
        sessionStorage.clear();
        localStorage.clear();

        // Redirect to home
        window.location.href = '/index.html';

    } catch (error) {
        console.error('Error signing out:', error);
        alert('Error al cerrar sesión');
    }
}

// Utility: Throttle function
function throttle(func, delay) {
    let timeoutId;
    let lastExecTime = 0;

    return function(...args) {
        const currentTime = Date.now();

        if (currentTime - lastExecTime > delay) {
            func.apply(this, args);
            lastExecTime = currentTime;
        } else {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
                lastExecTime = Date.now();
            }, delay - (currentTime - lastExecTime));
        }
    };
}