// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics();
const storage = firebase.storage();

// Check authentication
const accessGranted = localStorage.getItem('lck_access_granted');
const userEmail = localStorage.getItem('lck_user_email');

if (!accessGranted || accessGranted !== 'true') {
    window.location.href = 'index.html';
}

// Set user email in header
document.getElementById('userEmail').textContent = userEmail;

// Conference data
const conferenceData = {
    day1: {
        date: '2025-09-26',
        sessions: [
            { time: '08:00', title: 'Apertura del Evento', speaker: 'LCK Experience Team' },
            { time: '09:00', title: 'Transformación Personal', speaker: 'María González' },
            { time: '10:30', title: 'Liderazgo Consciente', speaker: 'Carlos Rodríguez' },
            { time: '12:00', title: 'Panel: Bienestar Integral', speaker: 'Varios Ponentes' },
            { time: '14:00', title: 'Mindfulness en Acción', speaker: 'Ana Martínez' },
            { time: '15:30', title: 'Desarrollo Profesional', speaker: 'Roberto Silva' },
            { time: '17:00', title: 'Networking Session', speaker: 'Todos' },
            { time: '18:30', title: 'Cierre Día 1', speaker: 'LCK Experience Team' }
        ]
    },
    day2: {
        date: '2025-09-27',
        sessions: [
            { time: '08:30', title: 'Bienvenida Día 2', speaker: 'LCK Experience Team' },
            { time: '09:30', title: 'Innovación y Creatividad', speaker: 'Laura Fernández' },
            { time: '11:00', title: 'Workshop: Herramientas de Cambio', speaker: 'Diego Morales' },
            { time: '13:00', title: 'Panel: Emprendimiento Social', speaker: 'Varios Ponentes' },
            { time: '14:30', title: 'Inteligencia Emocional', speaker: 'Patricia López' },
            { time: '16:00', title: 'Propósito de Vida', speaker: 'Alejandro García' },
            { time: '17:30', title: 'Ceremonia de Cierre', speaker: 'LCK Experience Team' }
        ]
    }
};

// Video configuration - Videos will be stored in Firebase Storage
// Path structure: conferences/day1/session-name.mp4
const videoLibrary = {
    day1: [
        {
            sessionId: 'opening-day1',
            title: 'Apertura del Evento',
            speaker: 'LCK Experience Team',
            videoPath: 'conferences/day1/apertura.mp4', // Firebase Storage path
            duration: '45 min'
        },
        {
            sessionId: 'transformation',
            title: 'Transformación Personal',
            speaker: 'María González',
            videoPath: 'conferences/day1/transformacion-personal.mp4',
            duration: '60 min'
        },
        {
            sessionId: 'leadership',
            title: 'Liderazgo Consciente',
            speaker: 'Carlos Rodríguez',
            videoPath: 'conferences/day1/liderazgo-consciente.mp4',
            duration: '60 min'
        }
    ],
    day2: [
        {
            sessionId: 'opening-day2',
            title: 'Bienvenida Día 2',
            speaker: 'LCK Experience Team',
            videoPath: 'conferences/day2/bienvenida-dia2.mp4',
            duration: '30 min'
        },
        {
            sessionId: 'innovation',
            title: 'Innovación y Creatividad',
            speaker: 'Laura Fernández',
            videoPath: 'conferences/day2/innovacion-creatividad.mp4',
            duration: '60 min'
        }
    ]
};

let currentVideoIndex = 0;
let currentDay = 'day1';

// Initialize conference access
function initializeConference() {
    // Check if videos are available
    const eventReleaseDate = new Date('2025-09-26T08:00:00');
    const now = new Date();

    if (now < eventReleaseDate) {
        // Show countdown
        startCountdown(eventReleaseDate);
        document.getElementById('videoPlaceholder').style.display = 'flex';
    } else {
        // Videos are available
        document.getElementById('videoPlaceholder').style.display = 'none';
        loadVideo(currentDay, currentVideoIndex);
    }

    // Load schedule
    loadSchedule(1);

    // Update viewer count (simulated for pre-recorded)
    updateViewerCount();
}

// Countdown timer
function startCountdown(targetDate) {
    function updateCountdown() {
        const now = new Date();
        const diff = targetDate - now;

        if (diff <= 0) {
            location.reload();
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        document.getElementById('countdown').innerHTML = `
            <div class="countdown-item">
                <span class="countdown-value">${days}</span>
                <span class="countdown-label">Días</span>
            </div>
            <div class="countdown-item">
                <span class="countdown-value">${hours.toString().padStart(2, '0')}</span>
                <span class="countdown-label">Horas</span>
            </div>
            <div class="countdown-item">
                <span class="countdown-value">${minutes.toString().padStart(2, '0')}</span>
                <span class="countdown-label">Minutos</span>
            </div>
            <div class="countdown-item">
                <span class="countdown-value">${seconds.toString().padStart(2, '0')}</span>
                <span class="countdown-label">Segundos</span>
            </div>
        `;
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// Load video from Firebase Storage
async function loadVideo(day, index) {
    const videos = videoLibrary[day];

    if (videos && videos[index]) {
        const videoData = videos[index];
        const videoPlayer = document.getElementById('conferenceStream');

        // Show loading state
        videoPlayer.style.opacity = '0.5';

        try {
            // Get video URL from Firebase Storage
            const storageRef = storage.ref(videoData.videoPath);
            const videoUrl = await storageRef.getDownloadURL();

            // Update video source
            videoPlayer.src = videoUrl;
            videoPlayer.load();
            videoPlayer.style.opacity = '1';

            // Update current session info
            document.getElementById('currentTitle').textContent = videoData.title;
            document.getElementById('currentSpeaker').textContent = videoData.speaker;
            document.getElementById('currentTime').textContent = videoData.duration;

            // Track video view
            analytics.logEvent('video_start', {
                video_title: videoData.title,
                video_day: day,
                user_email: userEmail
            });

            // Highlight in schedule
            highlightCurrentSession(videoData.sessionId);
        } catch (error) {
            console.error('Error loading video:', error);

            // Show placeholder message if video not found
            videoPlayer.style.display = 'none';
            const placeholder = document.getElementById('videoPlaceholder');
            placeholder.style.display = 'flex';
            placeholder.innerHTML = `
                <div class="placeholder-content">
                    <h2>Video Próximamente</h2>
                    <p>Este contenido estará disponible pronto.</p>
                    <p style="font-size: 0.9em; margin-top: 20px; opacity: 0.7;">
                        Si ya compró su acceso, recibirá una notificación cuando el video esté listo.
                    </p>
                </div>
            `;
        }
    }
}

// Function to play specific session
async function playSession(day, sessionId) {
    const videos = videoLibrary[day];
    const index = videos.findIndex(v => v.sessionId === sessionId);

    if (index !== -1) {
        currentDay = day;
        currentVideoIndex = index;
        await loadVideo(day, index);
    }
}

// Update current session info
function updateCurrentSession(sessions, currentHour) {
    let currentSession = sessions[0];

    for (const session of sessions) {
        const sessionHour = parseInt(session.time.split(':')[0]);
        if (sessionHour <= currentHour) {
            currentSession = session;
        } else {
            break;
        }
    }

    document.getElementById('currentTitle').textContent = currentSession.title;
    document.getElementById('currentSpeaker').textContent = currentSession.speaker;
    document.getElementById('currentTime').textContent = currentSession.time;

    // Update viewer count (simulated)
    const viewerCount = Math.floor(Math.random() * 500) + 1200;
    document.getElementById('viewerCount').textContent = `${viewerCount} espectadores`;
}

// Load schedule with clickable videos
function loadSchedule(day) {
    const dayKey = day === 1 ? 'day1' : 'day2';
    const videos = videoLibrary[dayKey];
    const scheduleData = day === 1 ? conferenceData.day1 : conferenceData.day2;
    const scheduleList = document.getElementById('scheduleList');

    scheduleList.innerHTML = '';

    scheduleData.sessions.forEach((session, index) => {
        const item = document.createElement('div');
        item.className = 'schedule-item';

        // Check if video is available
        const hasVideo = index < videos.length;

        if (hasVideo) {
            item.classList.add('has-video');
            item.style.cursor = 'pointer';
        }

        if (index === 0) item.classList.add('active');

        item.innerHTML = `
            <div class="schedule-time">${session.time}</div>
            <div class="schedule-title">${session.title}</div>
            <div class="schedule-speaker">${session.speaker}</div>
            ${hasVideo ? '<div class="video-indicator">🎥 Ver ahora</div>' : '<div class="video-indicator" style="opacity: 0.5">Próximamente</div>'}
        `;

        if (hasVideo) {
            item.addEventListener('click', () => {
                document.querySelectorAll('.schedule-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                playSession(dayKey, videos[index].sessionId);
            });
        }

        scheduleList.appendChild(item);
    });

    // Load upcoming sessions
    loadUpcomingSessions(scheduleData.sessions);
}

// Highlight current playing session
function highlightCurrentSession(sessionId) {
    document.querySelectorAll('.schedule-item').forEach(el => el.classList.remove('playing'));
    // Add visual indicator for currently playing
}

// Load upcoming sessions
function loadUpcomingSessions(sessions) {
    const upcomingList = document.getElementById('upcomingList');
    const now = new Date();
    const currentHour = now.getHours();

    upcomingList.innerHTML = '';

    sessions.forEach(session => {
        const sessionHour = parseInt(session.time.split(':')[0]);
        if (sessionHour > currentHour) {
            const item = document.createElement('div');
            item.className = 'upcoming-item';
            item.innerHTML = `
                <div class="upcoming-time">${session.time}</div>
                <div class="upcoming-title">${session.title}</div>
                <div class="upcoming-speaker">${session.speaker}</div>
            `;
            upcomingList.appendChild(item);
        }
    });
}

// Tab functionality
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;

        // Update button states
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update panel visibility
        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
        document.getElementById(`${tab}Tab`).classList.add('active');
    });
});

// Day selector
document.querySelectorAll('.day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const day = parseInt(btn.dataset.day);

        // Update button states
        document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Load schedule for selected day
        loadSchedule(day);
    });
});

// Language selector
document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;

        // Update button states
        document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // In production, this would switch the audio stream
        console.log(`Switched to ${lang} audio`);
    });
});

// Chat functionality
const chatMessages = [];
let chatSocket = null;

function initializeChat() {
    // In production, use WebSocket for real-time chat
    // chatSocket = new WebSocket('wss://your-server.com/chat');

    document.getElementById('chatForm').addEventListener('submit', (e) => {
        e.preventDefault();

        const input = document.getElementById('chatInput');
        const message = input.value.trim();

        if (message) {
            addChatMessage({
                author: userEmail.split('@')[0],
                text: message,
                timestamp: new Date()
            });

            input.value = '';
        }
    });
}

function addChatMessage(message) {
    const messagesContainer = document.getElementById('chatMessages');

    // Remove welcome message if it exists
    const welcome = messagesContainer.querySelector('.chat-welcome');
    if (welcome) welcome.remove();

    const messageEl = document.createElement('div');
    messageEl.className = 'chat-message';
    messageEl.innerHTML = `
        <div class="chat-author">${message.author}</div>
        <div class="chat-text">${message.text}</div>
    `;

    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Update viewer count (simulated for pre-recorded content)
function updateViewerCount() {
    const baseCount = 850;
    const randomVariation = Math.floor(Math.random() * 200);
    const viewerCount = baseCount + randomVariation;
    document.getElementById('viewerCount').textContent = `${viewerCount} espectadores`;

    // Update every 30 seconds for realism
    setTimeout(updateViewerCount, 30000);
}

// Logout function
function logout() {
    localStorage.removeItem('lck_access_granted');
    localStorage.removeItem('lck_user_email');
    localStorage.removeItem('lck_access_type');
    localStorage.removeItem('lck_coupon_used');
    window.location.href = 'index.html';
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
    initializeConference();
    initializeChat();
});