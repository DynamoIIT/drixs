// Socket.IO Connection
const socket = io();

// Supabase Import
// Supabase Client (Initialized async)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.4/+esm';
let supabase = null;

// Initialize Supabase from Server Config
async function initSupabase() {
    try {
        // Added timestamp for cache-busting
        const response = await fetch(`/config?t=${Date.now()}`);
        if (!response.ok) throw new Error("Failed to load config");
        const config = await response.json();

        if (!config.supabaseUrl || !config.supabaseKey) {
            console.error("? Invalid Config:", config);
            // alert("Server Config Error: Keys are missing.\nPlease RESTART your server terminal now.");
            throw new Error("Missing API Keys from Server");
        }

        supabase = createClient(config.supabaseUrl, config.supabaseKey);
        window.supabase = supabase; // Expose globally for testing
        console.log("? Supabase Initialized Securely");

        // Check session immediately for loader
        const { data } = await supabase.auth.getSession();
        if (data && data.session) {
            const welcomeScreen = document.getElementById('welcomeScreen');
            if (welcomeScreen && welcomeScreen.classList.contains('active')) {
                console.log("Session found during init, showing loader");
                showAuthLoader("RESTORING SESSION...", 10000);
            }
        }

        // Setup Auth Listener immediately after init
        setupAuthListener();
    } catch (e) {
        console.error("? Config Load Error:", e);
        alert("Configuration Error: " + e.message + "\n\nPlease RESTART your Node.js server to load the new keys.");
    }
}

// Start Init
initSupabase();


// DOM Elements
const welcomeScreen = document.getElementById('welcomeScreen');
const chatScreen = document.getElementById('chatScreen');
// const usernameInput = document.getElementById('usernameInput'); // Removed
// const startChatBtn = document.getElementById('startChatBtn'); // Removed
const googleLoginBtn = document.getElementById('googleLoginBtn');
const profileSetupContainer = document.getElementById('profileSetupContainer');
const googleLoginContainer = document.getElementById('googleLoginContainer');
const newUsernameInput = document.getElementById('newUsernameInput');
const newPasswordInput = document.getElementById('newPasswordInput');
const createAccountBtn = document.getElementById('createAccountBtn');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const onlineCount = document.getElementById('onlineCount');
const typingIndicators = document.getElementById('typingIndicators');
const reactionPicker = document.getElementById('reactionPicker');
const replyPreview = document.getElementById('replyPreview');
const notificationContainer = document.getElementById('notificationContainer');
const aiModal = document.getElementById('aiModal');
const aiMessages = document.getElementById('aiMessages');
const aiCloseBtn = document.getElementById('aiCloseBtn');
const loadingScreen = document.getElementById('loadingScreen');

// Chat Image Elements
const chatGalleryBtn = document.getElementById('chatGalleryBtn');
const chatImageInput = document.getElementById('chatImageInput');
const chatImagePreview = document.getElementById('chatImagePreview');

// Image Viewer Elements
const imageViewerModal = document.getElementById('imageViewerModal');
const viewerImage = document.getElementById('viewerImage');
const viewerCloseBtn = document.getElementById('viewerCloseBtn');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const zoomResetBtn = document.getElementById('zoomResetBtn');
const viewerZoomLevel = document.getElementById('viewerZoomLevel');

// Profile Setup Elements
const profilePicInput = document.getElementById('profilePicInput');
const setupProfilePicPreview = document.getElementById('setupProfilePicPreview');
const skipPicBtn = document.getElementById('skipPicBtn');
const newUserBioInput = document.getElementById('newUserBioInput');

// User Profile View Modal Elements
const userProfileModal = document.getElementById('userProfileModal');
const profileModalClose = document.getElementById('profileModalClose');
const viewProfilePic = document.getElementById('viewProfilePic');
const viewProfileUsername = document.getElementById('viewProfileUsername');
const viewProfileBio = document.getElementById('viewProfileBio');

// Settings Elements
const settingsModal = document.getElementById('settingsModal');
const settingsModalClose = document.getElementById('settingsModalClose');
const editProfilePicPreview = document.getElementById('editProfilePicPreview');
const editProfilePicInput = document.getElementById('editProfilePicInput');
const editUsernameInput = document.getElementById('editUsernameInput');
const editBioInput = document.getElementById('editBioInput');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const editProfileBtn = document.getElementById('editProfileBtn');
const logoutBtn = document.getElementById('logoutBtn');

// New Modal Elements
const onlineUsersModal = document.getElementById('onlineUsersModal');
const openOnlineListBtn = document.getElementById('openOnlineListBtn');
const closeOnlineModal = document.getElementById('closeOnlineModal');
const onlineCountBadge = document.getElementById('onlineCountBadge');
const userListSearch = document.getElementById('userListSearch');
const usersListContainer = document.getElementById('usersListContainer');

// Follow System & Profile Elements
const followUserBtn = document.getElementById('followUserBtn');
const viewFollowersCount = document.getElementById('viewFollowersCount');
const viewFollowingCount = document.getElementById('viewFollowingCount');
const followListModal = document.getElementById('followListModal');
const followListItems = document.getElementById('followListItems');
const followListTitle = document.getElementById('followListTitle');
const followListBack = document.getElementById('followListBack');
const followListClose = document.getElementById('followListClose');
const myFollowersCountDisplay = document.getElementById('myFollowersCount');
const myFollowingCountDisplay = document.getElementById('myFollowingCount');
const profileLoaderOverlay = document.getElementById('profileLoaderOverlay');

// Global Variables
let currentUser = null;
// Supabase User
let supabaseUser = null;

let userColor = '#ffffff';
const DEFAULT_AVATAR = 'assets/anonymous.jpg';
let currentUserProfilePic = DEFAULT_AVATAR;
let currentUserBio = 'Write something about uh.';
let typingTimer = null;
let selectedChatImage = null; // Store base64 of selected image
let selectedDMImages = new Map(); // userId -> base64
let viewerZoom = 1;
let cropper = null; // Cropper.js instance
let currentUserCroppedBlob = null; // Store the cropped image blob

// DOM Elements (Consolidated at top level for scoping)
let warnModal, warnCloseBtn, sendWarnBtn, cancelWarnBtn;
let confirmModal, confirmMessage, confirmYesBtn, confirmNoBtn;
let userHamburgerBtn, userHamburgerMenu, userHamburgerClose;
let developerPanel, panelCloseBtn, hamburgerBtn;
let isDeveloper = false;
let isModerator = false;

// ===== Auth Loader Helper Functions =====
let authLoaderTimeout = null;
let authLoaderInterval = null;
const loadingMessages = [
    "INITIALIZING NEURAL LINK...",
    "VERIFYING BIOMETRIC HASH...",
    "ESTABLISHING SECURE CONNECTION...",
    "DECRYPTING USER ENVIRONMENT...",
    "ACCESS GRANTED."
];

function showAuthLoader(initialText = 'INITIALIZING...', maxDuration = 15000) {
    const loader = document.getElementById('authLoader');
    const loaderText = document.querySelector('.auth-loader-text');

    if (loader) {
        loader.classList.add('active');
        if (loaderText) {
            loaderText.textContent = initialText;

            // Dynamic Text Cycling
            let msgIndex = 0;
            if (authLoaderInterval) clearInterval(authLoaderInterval);
            authLoaderInterval = setInterval(() => {
                loaderText.textContent = loadingMessages[msgIndex % loadingMessages.length];
                msgIndex++;
            }, 800);
        }

        // Safety timeout
        if (authLoaderTimeout) clearTimeout(authLoaderTimeout);
        authLoaderTimeout = setTimeout(() => {
            console.warn('Auth loader timeout reached, force hiding');
            hideAuthLoader();
        }, maxDuration);
    }
}

function hideAuthLoader() {
    const loader = document.getElementById('authLoader');
    if (loader) {
        loader.classList.remove('active');
    }
    if (authLoaderTimeout) {
        clearTimeout(authLoaderTimeout);
        authLoaderTimeout = null;
    }
    if (authLoaderInterval) {
        clearInterval(authLoaderInterval);
        authLoaderInterval = null;
    }
}
// ===== End Auth Loader Helpers =====
// DM System Variables
let isChatStarted = false;
let openDMWindows = new Map(); // userId -> window element
let dmMessages = new Map(); // userId -> messages array
let dmTypingUsers = new Map(); // userId -> typing status
let dmWindowZIndex = 1600;
function getCurrentDMUserId() {
    // returns the userId of the currently active DM window, or null
    const activeWindow = document.querySelector('.dm-window.active');
    return activeWindow ? activeWindow.dataset.userid : null;
}
// Follow System State
let currentUserFollowing = new Set(); // Set of user UIDs current user follows
let currentUserFollowers = new Set(); // Set of user UIDs following current user
let followListStack = []; // For cyclic navigation (stack of {type, userId, title})

// ================= CYBERPUNK THEME SYSTEM =================

let currentTheme = 'default';

function initializeTheme() {
    const savedTheme = localStorage.getItem('brochatz-theme') || 'default';
    const themeIcon = document.getElementById('themeIcon');
    const body = document.body;

    currentTheme = savedTheme;

    if (savedTheme === 'onyx') {
        body.setAttribute('data-theme', 'onyx');
        themeIcon.className = 'fas fa-gem theme-icon'; // Gem icon for luxury
    } else {
        body.removeAttribute('data-theme');
        themeIcon.className = 'fas fa-sun theme-icon';
    }
}

function toggleTheme() {
    const themeIcon = document.getElementById('themeIcon');
    const body = document.body;

    if (currentTheme === 'default') {
        // Activate Onyx Mode
        currentTheme = 'onyx';
        body.setAttribute('data-theme', 'onyx');
        themeIcon.className = 'fas fa-gem theme-icon';
        localStorage.setItem('brochatz-theme', 'onyx');

        showThemeActivation('ONYX LUXURY MODE', 'onyx');

    } else {
        // Activate Default Mode  
        currentTheme = 'default';
        body.removeAttribute('data-theme');
        themeIcon.className = 'fas fa-sun theme-icon';
        localStorage.setItem('brochatz-theme', 'default');

        showThemeActivation('RGB MODE ACTIVATED', 'default');
    }
}

function showThemeActivation(message, theme) {
    const activation = document.createElement('div');
    activation.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: ${theme === 'cyberpunk' ?
            'linear-gradient(45deg, #ff00ff, #00ffff, #00ff41)' :
            'linear-gradient(45deg, #ff006e, #3a86ff, #00ff88)'
        };
        color: ${theme === 'cyberpunk' ? '#0a0a0f' : '#ffffff'};
        padding: 25px 50px;
        border-radius: 15px;
        font-family: 'Orbitron', monospace;
        font-weight: bold;
        font-size: 1.4rem;
        z-index: 10000;
        animation: themeActivation 2.5s ease-out forwards;
        pointer-events: none;
        backdrop-filter: blur(20px);
        border: 2px solid ${theme === 'cyberpunk' ? '#ff00ff' : 'rgba(255,255,255,0.3)'};
        box-shadow: 0 0 50px ${theme === 'cyberpunk' ? 'rgba(255,0,255,0.8)' : 'rgba(255,255,255,0.4)'};
        text-shadow: ${theme === 'cyberpunk' ? '0 0 10px #0a0a0f' : 'none'};
    `;
    activation.textContent = message;
    document.body.appendChild(activation);

    // Create particles effect
    createThemeParticles(theme);

    setTimeout(() => {
        activation.remove();
    }, 2500);
}

function createThemeParticles(theme) {
    const colors = theme === 'cyberpunk' ?
        ['#ff00ff', '#00ffff', '#00ff41', '#ff6600'] :
        ['#ff006e', '#3a86ff', '#00ff88', '#ffbe0b'];

    for (let i = 0; i < 20; i++) {
        setTimeout(() => {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                width: 8px;
                height: 8px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                border-radius: 50%;
                pointer-events: none;
                z-index: 9999;
                animation: particleExplosion 1.5s ease-out forwards;
                transform: translate(-50%, -50%);
                box-shadow: 0 0 10px currentColor;
            `;

            const angle = (360 / 20) * i;
            const distance = 200 + Math.random() * 100;

            particle.style.setProperty('--angle', angle + 'deg');
            particle.style.setProperty('--distance', distance + 'px');

            document.body.appendChild(particle);

            setTimeout(() => particle.remove(), 1500);
        }, i * 50);
    }
}

// Add particle explosion animation
const particleStyle = document.createElement('style');
particleStyle.textContent = `
    @keyframes particleExplosion {
        0% { 
            opacity: 1; 
            transform: translate(-50%, -50%) rotate(var(--angle)) translateY(0) scale(1); 
        }
        100% { 
            opacity: 0; 
            transform: translate(-50%, -50%) rotate(var(--angle)) translateY(calc(-1 * var(--distance))) scale(0); 
        }
    }
`;
document.head.appendChild(particleStyle);

// Custom Error Popup Functions
function showCustomError(title, message) {
    const overlay = document.getElementById('customErrorOverlay');
    const titleEl = document.getElementById('errorTitle');
    const messageEl = document.getElementById('errorMessage');

    titleEl.textContent = title;
    messageEl.textContent = message;
    overlay.classList.add('active');
}

function hideCustomError() {
    const overlay = document.getElementById('customErrorOverlay');
    overlay.classList.remove('active');
}

window.showCustomError = showCustomError;
window.hideCustomError = hideCustomError;

// DOMContentLoaded handlers moved to initializeEventListeners or consolidated

let isTyping = false;
let selectedMessage = null;
let replyingTo = null;
let onlineUsers = new Map();
let phonkAudio = new Audio();
phonkAudio.loop = false;

// ================= SOUND EFFECTS SYSTEM =================
// Initialize from localStorage with proper string-to-boolean conversion
let soundEffectsEnabled = localStorage.getItem('soundEffectsEnabled') !== 'false'; // Default true

// Getter function to always check current state
function isSoundEnabled() {
    return localStorage.getItem('soundEffectsEnabled') !== 'false';
}

// Audio Context for generating beep sounds
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Sound effect generator
function playBeep(frequency = 800, duration = 100, volume = 0.3) {
    // Always check fresh from localStorage
    if (!isSoundEnabled()) {
        console.log('Sound blocked: soundEffectsEnabled =', isSoundEnabled());
        return;
    }

    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (err) {
        console.log('Sound playback failed:', err);
    }
}

// Different sound effects
const SoundEffects = {
    messageSent: () => playBeep(1000, 80, 0.2),      // High pitch, short beep
    messageReceived: () => playBeep(600, 100, 0.15), // Medium pitch
    notification: () => playBeep(800, 120, 0.2),     // Alert sound
    uiClick: () => playBeep(1200, 50, 0.1),          // Quick tick
    success: () => {                                  // Success chord
        playBeep(800, 100, 0.15);
        setTimeout(() => playBeep(1000, 100, 0.15), 100);
    },
    error: () => {                                    // Error buzz
        playBeep(300, 150, 0.2);
        setTimeout(() => playBeep(250, 150, 0.2), 150);
    }
};

// Initialize sound toggle from localStorage
function initializeSoundEffects() {
    const toggle = document.getElementById('soundEffectsToggle');
    const soundIcon = document.getElementById('soundIcon');
    const soundDescription = document.getElementById('soundDescription');

    if (toggle) {
        // Sync toggle with variable
        toggle.checked = soundEffectsEnabled;
        updateSoundIcon(soundEffectsEnabled);

        console.log('Sound effects initialized:', soundEffectsEnabled);

        toggle.addEventListener('change', function () {
            soundEffectsEnabled = this.checked;
            // Store as explicit string 'true' or 'false'
            localStorage.setItem('soundEffectsEnabled', soundEffectsEnabled ? 'true' : 'false');
            updateSoundIcon(soundEffectsEnabled);

            console.log('Sound effects toggled:', soundEffectsEnabled, 'localStorage:', localStorage.getItem('soundEffectsEnabled'));

            // Play a test beep when enabling
            if (soundEffectsEnabled) {
                SoundEffects.success();
            }
        });
    } else {
        console.warn('Sound toggle element not found');
    }
}

function updateSoundIcon(enabled) {
    const soundIcon = document.getElementById('soundIcon');
    const soundDescription = document.getElementById('soundDescription');

    if (soundIcon) {
        soundIcon.className = enabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
    }

    if (soundDescription) {
        soundDescription.textContent = enabled ? 'Sounds are enabled' : 'Sounds are disabled';
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', function () {
    createParticleField();
    initializeEventListeners();
    initializeSoundEffects(); // Initialize sound system


    // Auto-resize textarea
    messageInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
});

// Create Particle Field Effect
function createParticleField() {
    const particleField = document.querySelector('.particle-field');
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = Math.random() * 3 + 1 + 'px';
        particle.style.height = particle.style.width;
        particle.style.background = `hsl(${Math.random() * 360}, 70%, 60%)`;
        particle.style.borderRadius = '50%';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.opacity = Math.random() * 0.5 + 0.2;
        particle.style.animation = `floatParticle ${Math.random() * 20 + 10}s linear infinite`;
        particle.style.animationDelay = Math.random() * 20 + 's';
        particleField.appendChild(particle);
    }
}

// Add particle float animation dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes floatParticle {
        0% { transform: translate(0, 0) rotate(0deg); }
        25% { transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px) rotate(90deg); }
        50% { transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px) rotate(180deg); }
        75% { transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px) rotate(270deg); }
        100% { transform: translate(0, 0) rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Initialize Event Listeners
function initializeEventListeners() {
    // Welcome Screen Events
    // Auth Events
    // Auth Events
    if (googleLoginBtn) googleLoginBtn.addEventListener('click', handleGoogleLogin);


    // Standard Login Events
    const showLoginBtn = document.getElementById('showLoginBtn');
    const authOptionsContainer = document.getElementById('authOptionsContainer');
    const loginFormContainer = document.getElementById('loginFormContainer');
    const backToOptionsBtn = document.getElementById('backToOptionsBtn');
    const loginSubmitBtn = document.getElementById('loginSubmitBtn');
    const loginUsernameInput = document.getElementById('loginUsernameInput');
    const loginPasswordInput = document.getElementById('loginPasswordInput');

    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', () => {
            authOptionsContainer.style.display = 'none';
            loginFormContainer.style.display = 'block';
            loginUsernameInput.focus();
        });
    }

    if (backToOptionsBtn) {
        backToOptionsBtn.addEventListener('click', () => {
            loginFormContainer.style.display = 'none';
            authOptionsContainer.style.display = 'block';
        });
    }

    if (loginUsernameInput && loginPasswordInput && loginSubmitBtn) {
        const checkLoginInputs = () => {
            const u = loginUsernameInput.value.trim();
            const p = loginPasswordInput.value.trim();
            loginSubmitBtn.disabled = !(u.length >= 3 && p.length >= 6);
            if (!loginSubmitBtn.disabled) loginSubmitBtn.classList.add('ready');
            else loginSubmitBtn.classList.remove('ready');
        };

        loginUsernameInput.addEventListener('input', checkLoginInputs);
        loginPasswordInput.addEventListener('input', checkLoginInputs);

        loginSubmitBtn.addEventListener('click', handleStandardLogin);

        loginPasswordInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter' && !loginSubmitBtn.disabled) {
                handleStandardLogin();
            }
        });
    }

    if (newUsernameInput && newPasswordInput && createAccountBtn) {
        const checkInputs = () => {
            const u = newUsernameInput.value.trim();
            const p = newPasswordInput.value.trim();
            createAccountBtn.disabled = !(u.length >= 3 && p.length >= 6);
            if (!createAccountBtn.disabled) createAccountBtn.classList.add('ready');
            else createAccountBtn.classList.remove('ready');
        };

        newUsernameInput.addEventListener('input', checkInputs);
        newPasswordInput.addEventListener('input', checkInputs);
        createAccountBtn.addEventListener('click', handleCreateAccount);
    }
    // Elite Mode Events
    const developerUsername = document.getElementById('developerUsername');
    const developerPassword = document.getElementById('developerPassword');
    const eliteLoginBtn = document.getElementById('eliteLoginBtn');

    function checkEliteCredentials() {
        const username = developerUsername.value.trim();
        const password = developerPassword.value.trim();

        eliteLoginBtn.disabled = !(username && password);
    }

    developerUsername.addEventListener('input', checkEliteCredentials);
    developerPassword.addEventListener('input', checkEliteCredentials);

    eliteLoginBtn.addEventListener('click', function () {
        const username = developerUsername.value.trim();
        const password = developerPassword.value.trim();

        // Check Developer credentials
        if (username.toLowerCase() === 'developer' && password === 'dynamobro8085') {
            isDeveloper = true;
            isModerator = false;
            currentUser = 'DEVELOPER';
            startChat();

            // Play Phonk track once per session
            if (!sessionStorage.getItem('phonkPlayed')) {
                // Check if sounds are enabled
                if (isSoundEnabled()) {
                    phonkAudio.src = 'phonk.mp3';
                    phonkAudio.play().catch(err => console.log('Audio play blocked:', err));
                    phonkAudio.onended = () => {
                        phonkAudio.src = '';
                    };
                }
                sessionStorage.setItem('phonkPlayed', 'true');
            }
        }
        // Check Moderator credentials
        else if (username === 'BSE SENSEX' && password === 'noordhaliwal0001') {
            isDeveloper = false;
            isModerator = true;
            currentUser = 'BSE SENSEX';
            startChat();
        }
        else {
            alert('Invalid credentials!');
        }
    });

    eliteLoginBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    developerPassword.addEventListener('keypress', function (e) {
        if (e.key === 'Enter' && !eliteLoginBtn.disabled) {
            eliteLoginBtn.click();
        }
    });

    // Initialize Global DOM references
    warnModal = document.getElementById('warnModal');
    warnCloseBtn = document.getElementById('warnCloseBtn');
    sendWarnBtn = document.getElementById('sendWarnBtn');
    cancelWarnBtn = document.getElementById('cancelWarnBtn');
    confirmModal = document.getElementById('confirmModal');
    confirmMessage = document.getElementById('confirmMessage');
    confirmYesBtn = document.getElementById('confirmYesBtn');
    confirmNoBtn = document.getElementById('confirmNoBtn');
    // Developer Hamburger Menu
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const developerPanel = document.getElementById('developerPanel');
    const panelCloseBtn = document.getElementById('panelCloseBtn');

    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', () => {
            hamburgerBtn.classList.toggle('active');
            developerPanel.classList.toggle('open');

            // Fetch online users and banned users when panel opens
            if (developerPanel.classList.contains('open')) {
                socket.emit('get-online-users');

                // Fetch banned users if developer
                if (isDeveloper && typeof fetchBannedUsers === 'function') {
                    fetchBannedUsers();
                }
            }
        });
    }

    if (panelCloseBtn) {
        panelCloseBtn.addEventListener('click', () => {
            developerPanel.classList.remove('open');
            hamburgerBtn.classList.remove('active');
        });
    }

    // --- REGULAR USER HAMBURGER MENU ---
    // Moved to initializeDMSystem to avoid redundant listeners and conflicts


    // Warn Modal Events
    if (warnCloseBtn) warnCloseBtn.addEventListener('click', closeWarnModal);
    if (cancelWarnBtn) cancelWarnBtn.addEventListener('click', closeWarnModal);

    if (sendWarnBtn) {
        sendWarnBtn.addEventListener('click', () => {
            const username = document.getElementById('warnUserName').textContent;
            const reason = document.getElementById('warnReason').value.trim();
            if (reason) {
                socket.emit('warn-user', { username, reason });
                closeWarnModal();
            } else {
                alert('Please enter a reason');
            }
        });
    }

    // Custom Confirm Modal Logic
    let confirmCallback = null;

    window.showCustomConfirm = function (message, onConfirm) {
        if (!confirmModal) return;
        confirmMessage.textContent = message;
        confirmCallback = onConfirm;
        confirmModal.classList.add('active');
    };

    if (confirmYesBtn) {
        confirmYesBtn.addEventListener('click', () => {
            confirmModal.classList.remove('active');
            if (confirmCallback) confirmCallback();
        });
    }

    if (confirmNoBtn) {
        confirmNoBtn.addEventListener('click', () => {
            confirmModal.classList.remove('active');
            confirmCallback = null;
        });
    }



    // startChatBtn.addEventListener('click', startChat);

    // Chat Screen Events
    messageInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    messageInput.addEventListener('input', function () {
        if (!isTyping && this.value.trim()) {
            isTyping = true;
            socket.emit('typing-start');
        }

        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            if (isTyping) {
                isTyping = false;
                socket.emit('typing-stop');
            }
        }, 4000);
    });

    sendBtn.addEventListener('click', sendMessage);

    // Paste handler for global chat
    messageInput.addEventListener('paste', handlePaste);


    // AI Modal Events
    aiCloseBtn.addEventListener('click', closeAIModal);

    // Click outside to close modals
    document.addEventListener('click', function (e) {
        if (!reactionPicker.contains(e.target) && !e.target.closest('.message-bubble')) {
            hideReactionPicker();
        }

        if (e.target === aiModal) {
            closeAIModal();
        }
    });

    // Long press for mobile
    let longPressTimer;
    chatMessages.addEventListener('touchstart', function (e) {
        const messageBubble = e.target.closest('.message-bubble');
        if (messageBubble) {
            longPressTimer = setTimeout(() => {
                showReactionPicker(e, messageBubble);
            }, 500);
        }
    });

    chatMessages.addEventListener('touchend', function () {
        clearTimeout(longPressTimer);
    });

    // Context menu for desktop
    chatMessages.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        const messageBubble = e.target.closest('.message-bubble');
        if (messageBubble) {
            showReactionPicker(e, messageBubble);
        }
    });

    // Reaction picker events
    document.querySelectorAll('.reaction-emoji').forEach(emoji => {
        emoji.addEventListener('click', function () {
            if (!selectedMessage) return;

            const emojiValue = this.dataset.emoji;
            addReactionAnimation(this);

            // ?? Check where the message lives
            if (selectedMessage.closest('.dm-messages')) {
                // DM message
                const dmContainer = selectedMessage.closest('.dm-messages');
                const dmUserId = dmContainer.getAttribute('data-userid');

                socket.emit('dm-reaction', {
                    targetUserId: dmUserId,
                    messageId: selectedMessage.dataset.messageId,
                    emoji: emojiValue
                });
            } else {
                // Global chat
                socket.emit('message-reaction', {
                    messageId: selectedMessage.dataset.messageId,
                    emoji: emojiValue
                });
            }

            hideReactionPicker();
        });
    });

    document.getElementById('replyBtn').addEventListener('click', function () {
        if (selectedMessage) {
            if (reactionPicker.dataset.dmUserId) {
                // DM reply functionality can be added here
                console.log('DM reply functionality');
                delete reactionPicker.dataset.dmUserId;
            } else {
                // Global chat reply
                startReply(selectedMessage);
            }
            hideReactionPicker();
        }
    });

    // --- PROFILE & SETTINGS NEW LISTENERS ---

    // Profile Setup - Image Preview
    if (profilePicInput) {
        profilePicInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    setupProfilePicPreview.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Skip Profile Pic
    if (skipPicBtn) {
        skipPicBtn.addEventListener('click', () => {
            setupProfilePicPreview.src = `https://ui-avatars.com/api/?name=${newUsernameInput.value || 'User'}&background=random`;
            // Clear input
            profilePicInput.value = '';
        });
    }

    // User Profile View Modal Close
    if (profileModalClose) {
        profileModalClose.addEventListener('click', () => {
            userProfileModal.classList.remove('active');
        });
    }

    // Settings Modal Open/Close
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            // Populate settings
            editUsernameInput.value = currentUser;
            editBioInput.value = currentUserBio;
            editProfilePicPreview.src = currentUserProfilePic;
            settingsModal.classList.add('active');
            userHamburgerMenu.classList.remove('open');
            userHamburgerBtn.classList.remove('active');
        });
    }

    if (settingsModalClose) {
        settingsModalClose.addEventListener('click', () => {
            settingsModal.classList.remove('active');
        });
    }

    // Update Profile Pic in Settings (Preview)
    if (editProfilePicInput) {
        editProfilePicInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const cropImage = document.getElementById('cropImage');
                    cropImage.src = event.target.result;
                    document.getElementById('cropModal').classList.add('active');

                    if (cropper) {
                        cropper.destroy();
                    }

                    cropper = new Cropper(cropImage, {
                        aspectRatio: 1,
                        viewMode: 1,
                        preview: '.crop-preview',
                        dragMode: 'move',
                        autoCropArea: 0.8,
                        restore: false,
                        guides: true,
                        center: true,
                        highlight: false,
                        cropBoxMovable: true,
                        cropBoxResizable: true,
                        toggleDragModeOnDblclick: false,
                    });
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Crop Modal Listeners
    const cropModal = document.getElementById('cropModal');
    const cropModalClose = document.getElementById('cropModalClose');
    const cancelCropBtn = document.getElementById('cancelCropBtn');
    const applyCropBtn = document.getElementById('applyCropBtn');

    const closeCropModal = () => {
        cropModal.classList.remove('active');
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
    };

    if (cropModalClose) cropModalClose.addEventListener('click', closeCropModal);
    if (cancelCropBtn) cancelCropBtn.addEventListener('click', closeCropModal);

    if (applyCropBtn) {
        applyCropBtn.addEventListener('click', () => {
            if (!cropper) return;

            const canvas = cropper.getCroppedCanvas({
                width: 300,
                height: 300
            });

            editProfilePicPreview.src = canvas.toDataURL();

            // Convert to blob for later upload
            canvas.toBlob((blob) => {
                currentUserCroppedBlob = blob;
            }, 'image/jpeg', 0.9);

            closeCropModal();
            showNotification('Photo centered and cropped!', 'success');
        });
    }

    // Save Profile button
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', handleUpdateProfile);
    }

    // Trigger file input when clicking the "Change Profile Photo" p tag
    const changePhotoMsg = document.querySelector('.edit-profile-pic-section p');
    if (changePhotoMsg) {
        changePhotoMsg.addEventListener('click', () => {
            editProfilePicInput.click();
        });
    }

    // Logout button reinforcement
    function bindLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            console.log('Binding logout button');
            logoutBtn.onclick = null; // Clear old
            logoutBtn.addEventListener('click', (e) => {
                console.warn('Logout button clicked - triggering handler');
                e.preventDefault();
                e.stopPropagation();
                handleLogout();
            });
        } else {
            console.error('Logout button not found in DOM');
        }
    }
    bindLogout();

    // Online Users Modal
    if (openOnlineListBtn) {
        openOnlineListBtn.addEventListener('click', () => {
            onlineUsersModal.classList.add('active');
            if (userHamburgerMenu) userHamburgerMenu.classList.remove('open');
            if (userHamburgerBtn) userHamburgerBtn.classList.remove('active');
            requestUsersList();
        });
    }

    if (closeOnlineModal) {
        closeOnlineModal.addEventListener('click', () => {
            onlineUsersModal.classList.remove('active');
            // Re-open hamburger menu on back
            if (userHamburgerMenu) userHamburgerMenu.classList.add('open');
            const userHamburgerBtn = document.getElementById('userHamburgerBtn');
            if (userHamburgerBtn) userHamburgerBtn.classList.add('active');
        });
    }

    if (userListSearch) {
        userListSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            filterPublicUserList(term);
        });
    }

    // Chat Media Event Listeners
    if (chatGalleryBtn) {
        chatGalleryBtn.addEventListener('click', () => {
            chatImageInput.click();
        });
    }

    if (chatImageInput) {
        chatImageInput.addEventListener('change', handleChatImageSelection);
    }

    // Image Viewer Listeners
    if (viewerCloseBtn) {
        viewerCloseBtn.addEventListener('click', closeImageViewer);
    }

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => updateZoom(0.2));
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => updateZoom(-0.2));
    }

    if (zoomResetBtn) {
        zoomResetBtn.addEventListener('click', () => {
            viewerZoom = 1;
            applyZoom();
        });
    }

    // Close on background click
    if (imageViewerModal) {
        imageViewerModal.addEventListener('click', (e) => {
            if (e.target === imageViewerModal) closeImageViewer();
        });
    }

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (!imageViewerModal.classList.contains('active')) return;

        if (e.key === 'Escape') closeImageViewer();
        if (e.key === '+' || e.key === '=') updateZoom(0.2);
        if (e.key === '-' || e.key === '_') updateZoom(-0.2);
        if (e.key === '0') {
            viewerZoom = 1;
            applyZoom();
        }
    });

    // Keyboard controls moved to consolidated block above

    // Click outside to close models
    window.addEventListener('click', (e) => {
        if (e.target === userProfileModal) userProfileModal.classList.remove('active');
        if (e.target === settingsModal) settingsModal.classList.remove('active');
        if (e.target === onlineUsersModal) onlineUsersModal.classList.remove('active');
    });
}

// Start Chat Function
function startChat() {
    if (isChatStarted) {
        console.log("Chat already started, skipping redundant call.");
        return;
    }
    isChatStarted = true;
    let username;

    if (isDeveloper) {
        username = "DEVELOPER";
    } else if (isModerator) {
        username = "BSE SENSEX";
    } else {
        username = currentUser;
        // if (username.length < 2) return;
    }
    currentUser = username;
    // Initialize DM system
    initializeDMSystem();
    // Developer Phonk â€" play once per browser session
    if (currentUser === "DEVELOPER" && !sessionStorage.getItem('phonkPlayed')) {
        const phonkAudio = new Audio('phonk.mp3'); // file path relative to public folder
        phonkAudio.volume = 0.5; // optional volume
        phonkAudio.play().catch(() => {
            console.log('Autoplay blocked, will play after user interaction');
        });
        phonkAudio.addEventListener('ended', () => {
            console.log('Phonk finished playing');
        });
        sessionStorage.setItem('phonkPlayed', 'true');
    }

    // Show loading screen
    showLoadingScreen();



    setTimeout(() => {
        // Connect to socket
        socket.emit('user-joined', {
            username: username,
            isDeveloper: isDeveloper,
            isModerator: isModerator,
            uid: supabaseUser ? supabaseUser.id : null,
            profilePic: currentUserProfilePic,
            bio: currentUserBio
        });

        const devControls = document.getElementById('developerControls');
        const regControls = document.getElementById('regularUserControls');

        if (isDeveloper || isModerator) {
            if (devControls) devControls.style.display = 'flex';
            if (regControls) regControls.style.display = 'flex'; // Show BOTH
        } else {
            if (devControls) devControls.style.display = 'none';
            if (regControls) regControls.style.display = 'flex';
        }

        // Transition to chat screen
        setTimeout(() => {
            welcomeScreen.classList.remove('active');
            chatScreen.classList.add('active');
            hideLoadingScreen(); hideAuthLoader();
            messageInput.focus();
        }, 1000);
    }, 500);

    // Setup user hamburger menu (already initialized in initializeDMSystem, but ensuring visibility logic here)
    const regControls = document.getElementById('regularUserControls');
    if (regControls) regControls.style.display = 'flex';
}

// Send Message Function
function sendMessage() {
    const message = messageInput.value.trim();
    if (!message && !selectedChatImage) return;

    // Check if it's an AI command
    if (message.startsWith('/ai ')) {
        openAIModal();
        const aiPrompt = message.substring(4);
        addAIMessage(aiPrompt, 'user');
        showAITyping();
    }

    // Send message data
    const messageData = {
        message: message,
        image: selectedChatImage, // Include image if selected
        replyTo: replyingTo
    };

    socket.emit('chat-message', messageData);

    // Add send animation
    sendBtn.classList.add('sending');
    setTimeout(() => {
        sendBtn.classList.remove('sending');
    }, 600);

    // Clear input, preview and reply
    messageInput.value = '';
    messageInput.style.height = 'auto';
    removeChatImagePreview();
    clearReply();

    // Stop typing indicator
    if (isTyping) {
        isTyping = false;
        socket.emit('typing-stop');
    }
}

// Socket Event Listeners
socket.on('user-color-assigned', function (data) {
    userColor = data.color;
});

socket.on('admin-message', function (data) {
    addAdminMessage(data.message);
});

socket.on('chat-message', function (data) {
    addMessage(data);
    playMessageSound();
});

socket.on('user-notification', function (data) {
    showUserNotification(data);
});

socket.on('update-online-count', function (count) {
    updateOnlineCount(count);
});

socket.on('user-typing', function (data) {
    if (data.isTyping) {
        showTypingIndicator(data);
    } else {
        hideTypingIndicator(data.username);
    }
});

socket.on('message-reaction', function (data) {
    addMessageReaction(data);
    if (data.username !== currentUser) {
        showReactionNotification(data);
    }
});

socket.on('dm-reaction', data => {
    // Find the DM message
    const dmMessages = document.querySelector(`#dmMessages-${data.targetUserId}`);
    if (!dmMessages) return;

    const messageEl = dmMessages.querySelector(`[data-message-id="${data.messageId}"]`);
    if (!messageEl) return;

    // Add the reaction
    addReactionToElement(messageEl, data.emoji);
});


socket.on('ai-response', function (data) {
    hideAITyping();
    addAIMessage(data.response, 'bot');
});

socket.on('ai-typing', function (isTyping) {
    if (isTyping) {
        showAITyping();
    } else {
        hideAITyping();
    }
});

// ?? STONE AWARD DEBUG VERSION - Replace your socket listener with this

socket.on('stone-awarded', function (data) {
    console.log('?????? STONE AWARDED EVENT RECEIVED! ??????');
    console.log('Data received:', data);
    console.log('Username:', data.username);
    console.log('Stone:', data.stone);

    try {
        showStoneAwardMessage(data);
        console.log('? showStoneAwardMessage() called successfully');
    } catch (error) {
        console.error('? ERROR in showStoneAwardMessage:', error);
    }
});

// Function to display the stone award with cool effects
function showStoneAwardMessage(data) {
    console.log('?? Creating stone award visual...');

    const stoneDiv = document.createElement('div');
    stoneDiv.className = 'stone-award-message';

    stoneDiv.innerHTML = `
        <div class="stone-award-content">
            <div class="stone-award-fireworks"></div>
            <div class="stone-award-glow"></div>
            
            <div class="stone-award-header">
                <div class="stone-emoji-large">${data.stone.emoji}</div>
                <div class="stone-sparkles">???</div>
            </div>
            
            <div class="stone-award-text">
                <h2>?? CONGRATULATIONS ${data.username.toUpperCase()}! ??</h2>
                <div class="stone-name">${data.stone.name}</div>
                <div class="stone-description">${data.stone.description}</div>
                <div class="stone-screenshot-prompt">
                    ?? TAKE SCREENSHOT FAST! ??
                </div>
            </div>
            
            <div class="stone-confetti-container" id="stoneConfetti-${Date.now()}"></div>
        </div>
    `;

    console.log('?? Appending to chatMessages...');
    chatMessages.appendChild(stoneDiv);
    scrollToBottom();
    console.log('? Stone message added to DOM');

    // Create confetti explosion
    setTimeout(() => {
        console.log('?? Creating confetti...');
        createStoneConfetti(stoneDiv.querySelector('.stone-confetti-container'));
    }, 100);

    // Play celebration sound
    setTimeout(() => {
        console.log('?? Playing sound...');
        playStoneAwardSound();
    }, 200);

    // Auto-remove after 30 seconds
    setTimeout(() => {
        console.log('?? Starting fade out...');
        stoneDiv.style.animation = 'fadeOut 1s ease-out forwards';
        setTimeout(() => {
            stoneDiv.remove();
            console.log('??? Stone message removed');
        }, 1000);
    }, 30000);
}

// Create confetti effect - UPDATED to accept container parameter
function createStoneConfetti(container) {
    if (!container) {
        console.error('? Confetti container not found!');
        return;
    }

    console.log('?? Creating 50 confetti pieces...');
    const colors = ['#FFD700', '#FF69B4', '#00CED1', '#FF1493', '#7B68EE', '#00FF7F'];
    const emojis = ['??', '?', '?', '??', '??', '?'];

    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'stone-confetti';

            // Random: emoji or colored square
            if (Math.random() > 0.5) {
                confetti.textContent = emojis[Math.floor(Math.random() * emojis.length)];
                confetti.style.fontSize = (Math.random() * 20 + 15) + 'px';
            } else {
                confetti.style.width = (Math.random() * 10 + 5) + 'px';
                confetti.style.height = confetti.style.width;
                confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            }

            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';

            container.appendChild(confetti);

            setTimeout(() => confetti.remove(), 4000);
        }, i * 20);
    }
    console.log('? Confetti created');
}

// Play celebration sound
// Play celebration sound
function playStoneAwardSound() {
    // Check if sounds are enabled
    if (!isSoundEnabled()) {
        console.log('playStoneAwardSound blocked: sounds disabled');
        return;
    }

    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Create a cheerful sound
        const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C (major chord)

        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
                oscillator.type = 'sine';

                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
            }, index * 100);
        });
        console.log('? Sound played');
    } catch (error) {
        console.error('? Error playing sound:', error);
    }
}

socket.on('online-users-list', function (users) {
    displayOnlineUsers(users);
});

socket.on('user-kicked', function (data) {
    if (data.username === currentUser && !isDeveloper) {
        alert('You have been kicked out by the developer!');
        location.reload();
    }
});

// Handle being logged in from another device
socket.on('force-logout', function (data) {
    console.log('Force logout received:', data);
    alert(data.message || 'You have been logged in from another device or tab.');

    // Clear session and reload
    sessionStorage.clear();
    localStorage.setItem('intentionalLogout', 'true');
    window.location.reload();
});

// Message blocked notification
socket.on('message-blocked', function (data) {
    showNotification(data.message, 'error');

    // Visual warning effect
    const inputArea = document.querySelector('.message-input-area');
    inputArea.style.animation = 'shake 0.5s';
    setTimeout(() => {
        inputArea.style.animation = '';
    }, 500);
});

socket.on('user-warned', function (data) {
    if (data.username === currentUser) {
        alert(`âš ï¸ WARNING: You are being warned for: ${data.reason}`);
    }
});

socket.on('kick-notification', function (data) {
    addAdminMessage(`ðŸš« ${data.username} was kicked out by DEVELOPER`);
});

// DM Socket Events
socket.on('users-for-dm', function (users) {
    displayUsersForDM(users);
});

// DM message handler
socket.on('dm-message', function (data) {
    const messageData = {
        ...data,
        isOwn: false,
        status: 'delivered'
    };

    // ? Always store in memory via addDMMessageToWindow if window is open, 
    // OR store here if window is closed. 
    if (openDMWindows.has(data.senderId)) {
        addDMMessageToWindow(data.senderId, messageData);
    } else {
        // Window closed - must store manually
        if (!dmMessages.has(data.senderId)) {
            dmMessages.set(data.senderId, []);
        }

        // Final sanity check to avoid duplication in memory
        const history = dmMessages.get(data.senderId);
        if (!history.find(m => m.messageId === messageData.messageId)) {
            history.push(messageData);
        }

        showDMNotificationPopup(data.senderName, data.message);
    }

    // ? Play sound for every new DM
    SoundEffects.messageReceived();
});


socket.on('dm-typing-start', function (data) {
    showDMTypingIndicator(data.senderId, data.username, data.color);
});

socket.on('dm-typing-stop', function (data) {
    hideDMTypingIndicator(data.senderId);
});

socket.on('dm-message-status', function (data) {
    // Update message status (read/delivered)
    const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (messageElement) {
        const statusElement = messageElement.querySelector('.dm-message-status');
        if (statusElement) {
            const icon = data.status === 'read' ?
                '<i class="fas fa-check-double message-status-double"></i>' :
                '<i class="fas fa-check message-status-single"></i>';
            statusElement.innerHTML = icon;
        }
    }
});

socket.on('dm-reaction', function (data) {
    // Add reaction to DM message
    const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (messageElement) {
        // Add reaction display logic here (similar to global chat)
        console.log('DM reaction received:', data);
    }
});

// Developer login sound (Phonk broadcast)
// Developer login sound (Phonk broadcast)
socket.on("playPhonk", function (data) {
    if (!isSoundEnabled()) return; // check toggle

    try {
        const audio = new Audio(data.track);
        audio.volume = 0.5; // adjust volume if needed
        audio.play().catch(err => {
            console.log("Autoplay blocked, waiting for user interaction:", err);
        });
    } catch (err) {
        console.error("Error playing Phonk track:", err);
    }
});

// Message Functions
function addMessage(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.dataset.messageId = data.messageId;

    const isOwnMessage = data.username === currentUser;
    const uidParam = data.uid ? `'${data.uid}'` : 'null';

    let replyHtml = '';
    if (data.replyTo) {
        replyHtml = `
            <div class="reply-preview" style="border-left-color: ${data.replyTo.color}">
                <strong>${data.replyTo.username}:</strong> ${data.replyTo.message.substring(0, 50)}${data.replyTo.message.length > 50 ? '...' : ''}
            </div>
        `;
    }

    messageDiv.classList.add('message');

    let imageHtml = '';
    const imageToRender = data.image || (data.isGIF ? data.message : null);

    if (imageToRender) {
        imageHtml = `
            <div class="image-thumbnail-wrapper media-aesthetic-frame" onclick="openImageViewer('${imageToRender}')">
                <div class="image-loading-overlay">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>LOADING...</span>
                </div>
                <img src="${imageToRender}" 
                     class="chat-rendered-image" 
                     onload="this.previousElementSibling.style.opacity='0'; setTimeout(() => this.previousElementSibling.remove(), 500)">
                <div class="media-badge">MEDIA</div>
            </div>
        `;
    }

    messageDiv.innerHTML = `
        <img src="${data.profilePic || DEFAULT_AVATAR}" 
             class="message-profile-pic" 
             style="border-color: ${data.color}; cursor: pointer;"
             title="View Profile"
             onclick="showUserProfile(${uidParam})">
        <div class="message-bubble" style="border-left: 3px solid ${data.color}">
            ${replyHtml}
            <div class="message-header">
                <span class="username" style="color: ${data.color}; cursor: pointer;" onclick="showUserProfile(${uidParam})">
                    ${data.username}
                    ${data.isDeveloper ? '<i class="fas fa-check-circle developer-badge" title="Verified Developer"></i>' : ''}
                    ${data.isModerator ? '<i class="fas fa-check-circle moderator-badge" title="Verified Moderator"></i>' : ''}
                </span>
                <span class="timestamp">${formatTime(data.timestamp)}</span>
            </div>
            <div class="message-content">${parseMessage(data.message)}</div>
            ${imageHtml}
            <div class="message-reactions"></div>
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    scrollToBottom();

    // Add entrance animation
    setTimeout(() => {
        messageDiv.style.transform = 'translateY(0)';
        messageDiv.style.opacity = '1';
    }, 50);
}


socket.on('admin-action', function (data) {
    console.log('Admin action received:', data);
    if (data.action === 'kick') {
        // Mark user as kicked to prevent auto-login
        localStorage.setItem('wasKicked', 'true');
        localStorage.setItem('intentionalLogout', 'true');

        // Sign out and clear session
        if (supabase) {
            supabase.auth.signOut().then(() => {
                alert(`You have been kicked from the chat. Reason: ${data.reason || 'No reason provided'}`);
                sessionStorage.clear();
                window.location.reload();
            });
        } else {
            alert(`You have been kicked from the chat. Reason: ${data.reason || 'No reason provided'}`);
            sessionStorage.clear();
            window.location.reload();
        }
    } else if (data.action === 'warn') {
        alert(`⚠️ WARNING from Admin: ${data.reason || 'Please follow the rules.'}`);
    }
});

function addAdminMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message admin-message';

    messageDiv.innerHTML = `
        <div class="message-bubble">
            <div class="message-content">
                <i class="fas fa-robot"></i> ${message}
            </div>
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function addAIMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-chat-message ai-${type}-message`;

    const avatar = type === 'user' ? '??' : '?????';

    messageDiv.innerHTML = `
        <div class="message-header">
            <span>${avatar} ${type === 'user' ? 'You' : 'AI Assistant'}</span>
        </div>
        <div class="message-content">${escapeHtml(message)}</div>
    `;

    aiMessages.appendChild(messageDiv);
    aiMessages.scrollTop = aiMessages.scrollHeight;
}

// Typing Indicators
function showTypingIndicator(data) {
    // Remove existing indicator for this user
    hideTypingIndicator(data.username);

    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.dataset.username = data.username;

    typingDiv.innerHTML = `
        <span style="color: ${data.color}">${data.username}</span> is typing
        <div class="typing-dots">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;

    typingIndicators.appendChild(typingDiv);
    scrollToBottom();
}

function hideTypingIndicator(username) {
    const existingIndicator = typingIndicators.querySelector(`[data-username="${username}"]`);
    if (existingIndicator) {
        existingIndicator.style.animation = 'typingSlideOut 0.3s ease-in forwards';
        setTimeout(() => {
            existingIndicator.remove();
        }, 300);
    }
}

// AI Modal Functions
function openAIModal() {
    aiModal.style.display = 'flex';
    aiMessages.innerHTML = '';
    addAIMessage("Hello! I'm your AI assistant. How can I help you today?", 'bot');
}

function closeAIModal() {
    aiModal.style.display = 'none';
}

function showAITyping() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'ai-chat-message ai-bot-message ai-typing';
    typingDiv.innerHTML = `
        <div class="message-header">
            <span>ðŸ¤– AI Assistant</span>
        </div>
        <div class="typing-dots">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    aiMessages.appendChild(typingDiv);
    aiMessages.scrollTop = aiMessages.scrollHeight;
}

function hideAITyping() {
    const typingMessage = aiMessages.querySelector('.ai-typing');
    if (typingMessage) {
        typingMessage.remove();
    }
}

// Reaction System
function showReactionPicker(event, messageBubble) {
    selectedMessage = messageBubble.closest('.message');

    const rect = messageBubble.getBoundingClientRect();
    reactionPicker.style.display = 'block';
    reactionPicker.style.left = Math.min(rect.left, window.innerWidth - 200) + 'px';
    reactionPicker.style.top = (rect.top - reactionPicker.offsetHeight - 10) + 'px';

    // Add show animation
    reactionPicker.style.animation = 'pickerSlideIn 0.3s ease-out';
}

function hideReactionPicker() {
    reactionPicker.style.display = 'none';
    selectedMessage = null;
}

function addReactionAnimation(emojiElement) {
    // Create floating emoji animation
    const floatingEmoji = document.createElement('div');
    floatingEmoji.textContent = emojiElement.textContent;
    floatingEmoji.style.position = 'fixed';
    floatingEmoji.style.left = emojiElement.getBoundingClientRect().left + 'px';
    floatingEmoji.style.top = emojiElement.getBoundingClientRect().top + 'px';
    floatingEmoji.style.fontSize = '2rem';
    floatingEmoji.style.pointerEvents = 'none';
    floatingEmoji.style.zIndex = '9999';
    floatingEmoji.style.animation = 'reactionFloat 1s ease-out forwards';

    document.body.appendChild(floatingEmoji);

    setTimeout(() => {
        floatingEmoji.remove();
    }, 1000);
}

// Add reaction float animation
const reactionStyle = document.createElement('style');
reactionStyle.textContent = `
    @keyframes reactionFloat {
        0% { transform: scale(1) translateY(0); opacity: 1; }
        50% { transform: scale(1.5) translateY(-30px); opacity: 0.8; }
        100% { transform: scale(0.5) translateY(-60px); opacity: 0; }
    }
    
    @keyframes typingSlideOut {
        0% { opacity: 1; transform: translateX(0); }
        100% { opacity: 0; transform: translateX(-20px); }
    }
`;
document.head.appendChild(reactionStyle);

function addMessageReaction(data) {
    const message = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (message) {
        const reactionsContainer = message.querySelector('.message-reactions');

        // Check if reaction already exists
        let existingReaction = reactionsContainer.querySelector(`[data-emoji="${data.emoji}"]`);

        if (existingReaction) {
            const count = existingReaction.querySelector('.reaction-count');
            count.textContent = parseInt(count.textContent) + 1;
            existingReaction.style.animation = 'reactionBounce 0.3s ease-out';
        } else {
            const reactionElement = document.createElement('span');
            reactionElement.className = 'message-reaction';
            reactionElement.dataset.emoji = data.emoji;
            reactionElement.innerHTML = `
                ${data.emoji} <span class="reaction-count">1</span>
            `;
            reactionElement.style.animation = 'reactionSlideIn 0.3s ease-out';
            reactionsContainer.appendChild(reactionElement);
        }
    }
}

// Reply System
function startReply(messageElement) {
    const username = messageElement.querySelector('.username').textContent;
    const messageContent = messageElement.querySelector('.message-content').textContent;
    const userColor = messageElement.querySelector('.username').style.color;

    replyingTo = {
        username: username,
        message: messageContent,
        color: userColor
    };

    replyPreview.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong style="color: ${userColor}">Replying to ${username}:</strong>
                <div style="color: rgba(255,255,255,0.7); font-size: 0.9rem; margin-top: 2px;">
                    ${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}
                </div>
            </div>
            <button onclick="clearReply()" style="background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; font-size: 1.2rem;">Ã—</button>
        </div>
    `;
    replyPreview.style.display = 'block';
    messageInput.focus();
}

function clearReply() {
    replyingTo = null;
    replyPreview.style.display = 'none';
}

function showUserNotification(data) {
    const notification = document.createElement('div');
    notification.className = `notification ${data.type}`;

    let icon, message;

    switch (data.type) {
        case 'join':
            icon = '??';
            message = `<strong style="color: ${data.color}">${data.username}</strong> ${data.message}`;
            break;
        case 'exit':
        case 'leave':
            icon = '??';
            message = `<strong style="color: ${data.color}">${data.username}</strong> ${data.message}`;
            break;
        case 'comment':
            icon = '??';
            message = `<strong style="color: ${data.color}">${data.username}</strong> commented on your post`;
            break;
        case 'reaction':
            icon = data.emoji || '??';
            message = `<strong style="color: ${data.color}">${data.username}</strong> reacted to your ${data.target || 'message'}`;
            break;
        default:
            icon = '??';
            message = `<strong style="color: ${data.color}">${data.username}</strong> ${data.message}`;
    }

    notification.innerHTML = `
        <div class="notification-content">
            ${icon} ${message}
        </div>
    `;

    notificationContainer.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('notification-burst');
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 3000);
}


function showReactionNotification(data) {
    const notification = document.createElement('div');
    notification.className = 'notification reaction';

    notification.innerHTML = `
        <div class="notification-content">
            ${data.emoji} <strong style="color: ${data.color}">${data.username}</strong> reacted to your message
        </div>
    `;

    notificationContainer.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('notification-burst');
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 2000);
}

// ================= DM POPUP NOTIFICATION =================
function showDMNotificationPopup(from, message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <div class="notification-content">
            <strong style="color:#3a86ff">${from}</strong> sent: ${escapeHtml(message)}
        </div>
    `;

    notificationContainer.appendChild(notification);

    // Remove after 18 seconds
    setTimeout(() => {
        notification.remove();
    }, 8000);
}

// Utility Functions
function updateOnlineCount(count) {
    if (onlineCount) onlineCount.textContent = count;
    if (onlineCountBadge) onlineCountBadge.textContent = `${count} Online`;

    // Add pulse animation
    if (onlineCount) {
        onlineCount.style.animation = 'none';
        setTimeout(() => {
            onlineCount.style.animation = 'countPulse 0.5s ease-out';
        }, 10);
    }
}

// Add count pulse animation
const countStyle = document.createElement('style');
countStyle.textContent = `
    @keyframes countPulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
    }
    
    @keyframes reactionBounce {
        0% { transform: scale(1); }
        50% { transform: scale(1.3); }
        100% { transform: scale(1); }
    }
    
    @keyframes reactionSlideIn {
        0% { opacity: 0; transform: scale(0.5); }
        100% { opacity: 1; transform: scale(1); }
    }
    
    .message-reaction {
        display: inline-block;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 15px;
        padding: 4px 8px;
        margin: 5px 5px 0 0;
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .message-reaction:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.1);
    }
    
    .reaction-count {
        font-weight: 600;
        margin-left: 3px;
    }
`;
document.head.appendChild(countStyle);

// Force Logout Listener
socket.on('force-logout', (data) => {
    alert(data.message || 'You have been logged out.');
    handleLogout();
    window.location.reload();
});

// Smart Scroll System
let userScrolledUp = false;
const scrollToBottomBtn = document.getElementById('scrollToBottomBtn');

function isUserAtBottom() {
    const threshold = 100; // pixels from bottom
    return chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < threshold;
}

function scrollToBottom(force = false) {
    if (force || !userScrolledUp) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
        if (scrollToBottomBtn) {
            scrollToBottomBtn.style.display = 'none';
            scrollToBottomBtn.classList.remove('new-message');
        }
    } else {
        // User is scrolled up, show button with animation
        if (scrollToBottomBtn) {
            scrollToBottomBtn.style.display = 'flex';
            scrollToBottomBtn.classList.add('new-message');
        }
    }
}

// Monitor scroll position
if (chatMessages) {
    chatMessages.addEventListener('scroll', () => {
        userScrolledUp = !isUserAtBottom();

        if (userScrolledUp) {
            if (scrollToBottomBtn) {
                scrollToBottomBtn.style.display = 'flex';
            }
        } else {
            if (scrollToBottomBtn) {
                scrollToBottomBtn.style.display = 'none';
                scrollToBottomBtn.classList.remove('new-message');
            }
        }
    });
}

// Scroll to bottom button click handler
if (scrollToBottomBtn) {
    scrollToBottomBtn.addEventListener('click', () => {
        scrollToBottom(true);
        userScrolledUp = false;
    });
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Advanced Message Parsing (Links & Media)
function parseMessage(text) {
    if (!text) return '';

    // 1. Escape HTML for safety
    let escaped = escapeHtml(text).trim();

    // 2. Identify URLs
    const urlPattern = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

    return escaped.replace(urlPattern, function (url) {
        // Detect media (direct files OR service links)
        const isDirectMedia = /\.(jpeg|jpg|gif|png|webp|svg|mp4)($|\?)/i.test(url);
        const isTenor = /tenor\.com\/view/i.test(url);
        const isGiphy = /giphy\.com\/gifs/i.test(url);

        if (isDirectMedia || isTenor || isGiphy) {
            return `
                <div class="message-link-preview">
                    <a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>
                    <div class="image-thumbnail-wrapper media-aesthetic-frame" onclick="openImageViewer('${url}')">
                        <img src="${url}" class="chat-rendered-image" onerror="this.parentElement.style.display='none'" loading="lazy">
                        <div class="media-badge">MEDIA</div>
                    </div>
                </div>
            `;
        }

        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
}

// ??? Unified Image/GIF Processor
function processMediaFile(file, isDM = false, userId = null) {
    if (!file) return;

    // Check if it's an image OR gif
    const isImage = file.type.startsWith('image/');

    if (!isImage) {
        showCustomError('Invalid File', 'Please select a valid image or GIF file.');
        return;
    }

    if (file.size > 10 * 1024 * 1024) { // Increased to 10MB
        showCustomError('File Too Large', 'Please select a file smaller than 10MB.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const result = e.target.result;

        if (isDM) {
            selectedDMImages.set(userId, result);
            const preview = document.getElementById(`dmImagePreview-${userId}`);
            if (preview) {
                preview.innerHTML = `
                    <div class="preview-thumb-container">
                        <img src="${result}" alt="DM Preview">
                        <button class="remove-preview-btn" onclick="removeDMImagePreview('${userId}')"><i class="fas fa-times"></i></button>
                    </div>
                `;
                preview.style.display = 'flex';
            }
            document.getElementById(`dmInput-${userId}`).focus();
        } else {
            selectedChatImage = result;
            chatImagePreview.innerHTML = `
                <div class="preview-thumb-container">
                    <img src="${result}" alt="Chat Preview">
                    <button class="remove-preview-btn" onclick="removeChatImagePreview()"><i class="fas fa-times"></i></button>
                </div>
                <div class="preview-info">
                    <span style="display: block; font-size: 0.8rem; color: #fff; font-weight: 600;">MEDIA READY</span>
                    <span style="font-size: 0.7rem; color: rgba(255,255,255,0.6);">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
            `;
            chatImagePreview.style.display = 'flex';
            messageInput.focus();
        }
    };
    reader.readAsDataURL(file);
}

// ?? Keyboard Paste Handler (Images & GIFs)
function handlePaste(e, isDM = false, userId = null) {
    const clipboardData = e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData);
    if (!clipboardData) return;

    const items = clipboardData.items;
    let handled = false;

    // 1. Try to catch actual files (files, blobs)
    for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            processMediaFile(file, isDM, userId);
            e.preventDefault();
            handled = true;
            break;
        }
    }

    // 2. If not a file, check if it's a URL that looks like a GIF/Image
    if (!handled) {
        const text = clipboardData.getData('text');
        const isMediaUrl = /\.(jpeg|jpg|gif|png|webp|svg|mp4)($|\?)/i.test(text) ||
            text.includes('tenor.com/view') ||
            text.includes('giphy.com/gifs');

        if (isMediaUrl) {
            e.preventDefault();
            // Treat the link as a selected image
            if (isDM) {
                selectedDMImages.set(userId, text);
                const preview = document.getElementById(`dmImagePreview-${userId}`);
                if (preview) {
                    preview.innerHTML = `
                        <div class="preview-thumb-container">
                            <img src="${text}" alt="DM Preview">
                            <button class="remove-preview-btn" onclick="removeDMImagePreview('${userId}')"><i class="fas fa-times"></i></button>
                        </div>
                    `;
                    preview.style.display = 'flex';
                }
            } else {
                selectedChatImage = text;
                chatImagePreview.innerHTML = `
                    <div class="preview-thumb-container">
                        <img src="${text}" alt="Chat Preview">
                        <button class="remove-preview-btn" onclick="removeChatImagePreview()"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="preview-info">
                        <span style="display: block; font-size: 0.8rem; color: #fff; font-weight: 600;">LINK MEDIA READY</span>
                        <span style="font-size: 0.7rem; color: rgba(255,255,255,0.6);">External Source</span>
                    </div>
                `;
                chatImagePreview.style.display = 'flex';
            }
            handled = true;
        }
    }
}

// Chat Image Selection & Preview
function handleChatImageSelection(event) {
    const file = event.target.files[0];
    processMediaFile(file, false);
}

function removeChatImagePreview() {
    selectedChatImage = null;
    chatImageInput.value = '';
    chatImagePreview.style.display = 'none';
    chatImagePreview.innerHTML = '';
}

// Image Viewer Logic
function openImageViewer(src) {
    if (!src) return;

    // Close other sidebars/modals to prevent conflicts
    if (userHamburgerMenu) userHamburgerMenu.classList.remove('open');
    if (userHamburgerBtn) userHamburgerBtn.classList.remove('active');
    if (onlineUsersModal) onlineUsersModal.classList.remove('active');

    viewerImage.src = src;
    viewerZoom = 1;
    applyZoom();
    imageViewerModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
}

function closeImageViewer() {
    imageViewerModal.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
    setTimeout(() => {
        viewerImage.src = '';
    }, 300);
}

function updateZoom(delta) {
    viewerZoom = Math.min(Math.max(0.5, viewerZoom + delta), 3);
    applyZoom();
}

function applyZoom() {
    if (viewerImage) {
        viewerImage.style.transform = `scale(${viewerZoom})`;
    }
    if (viewerZoomLevel) {
        viewerZoomLevel.textContent = `${viewerZoom.toFixed(2)}x`;
    }
}

// Add these to window for button clicks
window.removeChatImagePreview = removeChatImagePreview;
window.openImageViewer = openImageViewer;

function playMessageSound() {
    // Check if sounds are enabled
    if (!isSoundEnabled()) {
        console.log('playMessageSound blocked: sounds disabled');
        return;
    }

    // Create a subtle notification sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
}

function showLoadingScreen() {
    loadingScreen.style.display = 'flex';
}

function hideLoadingScreen() {
    loadingScreen.style.display = 'none';
}

// Initialize particle effects on scroll
chatMessages.addEventListener('scroll', function () {
    if (Math.random() > 0.95) { // 5% chance on scroll
        createScrollParticle();
    }
});

function createScrollParticle() {
    const particle = document.createElement('div');
    particle.style.position = 'absolute';
    particle.style.width = '4px';
    particle.style.height = '4px';
    particle.style.background = `hsl(${Math.random() * 360}, 70%, 60%)`;
    particle.style.borderRadius = '50%';
    particle.style.right = '10px';
    particle.style.top = Math.random() * chatMessages.offsetHeight + 'px';
    particle.style.pointerEvents = 'none';
    particle.style.animation = 'particleFade 2s ease-out forwards';

    chatMessages.appendChild(particle);

    setTimeout(() => {
        particle.remove();
    }, 2000);
}

// Add final particle animation
const particleFadeStyle = document.createElement('style');
particleFadeStyle.textContent = `
    @keyframes particleFade {
        0% { opacity: 1; transform: translateX(0); }
        100% { opacity: 0; transform: translateX(-50px); }
    }
`;
document.head.appendChild(particleFadeStyle);

// Add some final polish effects
document.addEventListener('mousemove', function (e) {
    if (Math.random() > 0.99) { // Very rare cursor trail
        createCursorTrail(e.clientX, e.clientY);
    }
});

function createCursorTrail(x, y) {
    const trail = document.createElement('div');
    trail.style.position = 'fixed';
    trail.style.left = x + 'px';
    trail.style.top = y + 'px';
    trail.style.width = '3px';
    trail.style.height = '3px';
    trail.style.background = `hsl(${Math.random() * 360}, 70%, 60%)`;
    trail.style.borderRadius = '50%';
    trail.style.pointerEvents = 'none';
    trail.style.zIndex = '999';
    trail.style.animation = 'trailFade 1s ease-out forwards';

    document.body.appendChild(trail);

    setTimeout(() => {
        trail.remove();
    }, 1000);
}

// Add trail animation
const trailStyle = document.createElement('style');
trailStyle.textContent = `
    @keyframes trailFade {
        0% { opacity: 0.8; transform: scale(1); }
        100% { opacity: 0; transform: scale(0); }
    }
`;
document.head.appendChild(trailStyle);

// Developer Functions
// ================= USER LIST & TABS SYSTEM =================

let currentUserListTab = 'online'; // 'online' or 'global'
let globalProfilesCache = [];
let lastGlobalFetchTime = 0;
let currentOnlineUsersList = []; // Store for cross-referencing

// Initialize Tabs
document.addEventListener('DOMContentLoaded', () => {
    const tabOnlineBtn = document.getElementById('tabOnlineBtn');
    const tabGlobalBtn = document.getElementById('tabGlobalBtn');
    const publicUserSearch = document.getElementById('publicUserSearch');

    if (tabOnlineBtn && tabGlobalBtn) {
        tabOnlineBtn.addEventListener('click', () => switchPublicUserListTab('online'));
        tabGlobalBtn.addEventListener('click', () => switchPublicUserListTab('global'));
    }

    // Debounce search input for better performance
    let searchDebounceTimer = null;
    if (publicUserSearch) {
        publicUserSearch.addEventListener('input', (e) => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                const searchTerm = e.target.value.toLowerCase();
                filterPublicUserList(searchTerm);
            }, 200); // 200ms debounce
        });
    }

    // Wire up the Hamburger "USERS" button to open the modal
    const openListBtn = document.getElementById('openOnlineListBtn');
    const onlineModal = document.getElementById('onlineUsersModal');
    const closeOnlineModal = document.getElementById('closeOnlineModal');

    if (openListBtn && onlineModal) {
        openListBtn.addEventListener('click', () => {
            onlineModal.style.display = 'flex';
            switchPublicUserListTab('online');
        });
    }

    if (closeOnlineModal && onlineModal) {
        closeOnlineModal.addEventListener('click', () => {
            onlineModal.style.display = 'none';
        });
    }
});

function switchPublicUserListTab(tab) {
    currentUserListTab = tab;

    // Update UI
    const tabOnlineBtn = document.getElementById('tabOnlineBtn');
    const tabGlobalBtn = document.getElementById('tabGlobalBtn');
    if (tabOnlineBtn) tabOnlineBtn.classList.toggle('active', tab === 'online');
    if (tabGlobalBtn) tabGlobalBtn.classList.toggle('active', tab === 'global');

    // Refresh List
    if (tab === 'online') {
        renderPublicUserList(currentOnlineUsersList, 'online');
    } else {
        fetchGlobalUsers();
    }
}


function showUserListSkeleton() {
    const usersList = document.getElementById('usersListContainer');
    if (!usersList) return;

    usersList.innerHTML = '';
    const fragment = document.createDocumentFragment();

    // Create 8 skeleton items
    for (let i = 0; i < 8; i++) {
        const div = document.createElement('div');
        div.className = 'skeleton-item';
        div.innerHTML = `
            <div class="skeleton-avatar"></div>
            <div class="skeleton-info">
                <div class="skeleton-text title"></div>
                <div class="skeleton-text subtitle"></div>
            </div>
        `;
        fragment.appendChild(div);
    }

    usersList.appendChild(fragment);
}

async function fetchGlobalUsers() {
    const usersList = document.getElementById('usersListContainer');
    // Show skeleton loader instead of spinner
    showUserListSkeleton();

    // Cache for 60 seconds
    if (Date.now() - lastGlobalFetchTime < 60000 && globalProfilesCache.length > 0) {
        renderPublicUserList(globalProfilesCache, 'global');
        return;
    }

    try {
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('*')
            .order('username');

        if (error) throw error;

        globalProfilesCache = profiles.map(p => ({
            username: p.username,
            avatar_url: p.avatar_url,
            bio: p.bio,
            isGlobal: true // Marker
        }));

        lastGlobalFetchTime = Date.now();
        renderPublicUserList(globalProfilesCache, 'global');

    } catch (err) {
        console.error("Error fetching global users:", err);
        usersList.innerHTML = '<div style="text-align:center; padding: 20px;">Failed to load users.</div>';
    }
}

function requestOnlineUsers() {
    // Request online users for everyone (or mostly developer if restricted on server)
    socket.emit('get-online-users');
}

function displayOnlineUsers(users) {
    currentOnlineUsersList = users;

    // Update count
    if (typeof updateOnlineCount === 'function') updateOnlineCount(users.length);

    // 1. Update Developer Panel List
    renderDevUserList(users);

    // 2. Update Public User List (if active)
    if (currentUserListTab === 'online') {
        renderPublicUserList(users, 'online');
    }
}

// Render Developer Panel List (Simple, with Admin Actions)
function renderDevUserList(users) {
    const devList = document.getElementById('devOnlineUsersList');
    if (!devList) return;

    devList.innerHTML = '';
    users.forEach(user => {
        if (user.username !== currentUser) {
            const userDiv = document.createElement('div');
            userDiv.className = 'user-item';
            // Responsive flex wrap to prevent buttons from hiding
            userDiv.style.cssText = 'display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; padding: 10px; margin: 5px 0; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; gap: 8px;';
            const uidParam = user.uid ? `'${user.uid}'` : 'null';

            userDiv.innerHTML = `
                <div class="user-info" onclick="showUserProfile(${uidParam})" style="cursor: pointer; flex: 1 1 150px; min-width: 0; overflow: hidden;" title="View Profile">
                    <div class="user-name" style="color: ${user.color}; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${user.username}</div>
                    <div class="user-ip" style="font-size: 0.8em; color: #888;">IP: ${user.ip}</div>
                </div>
                <div class="user-actions" style="display: flex; gap: 5px; flex-shrink: 0; flex: 1 1 auto; justify-content: flex-end;">
                    <button class="user-action-btn kick-btn" onclick="kickUser('${user.username}')" style="padding: 5px 10px; background: #ff9800; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85em; white-space: nowrap;">Kick</button>
                    <button class="user-action-btn warn-btn" onclick="openWarnModal('${user.username}')" style="padding: 5px 10px; background: #ffeb3b; color: #000; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85em; white-space: nowrap;">Warn</button>
                    <button class="user-action-btn ban-btn" onclick="banUser(${uidParam}, '${user.username}')" style="padding: 5px 10px; background: #ff0000; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85em; white-space: nowrap;">BAN</button>
                </div>
            `;
            devList.appendChild(userDiv);
        }
    });
}

// Render Public User List (Tabs, Status Dots, DMs)
function renderPublicUserList(users, mode) {
    const usersList = document.getElementById('usersListContainer');
    if (!usersList) return;

    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();

    // Create Map for quick online status lookup
    const onlineMap = new Map();
    if (currentOnlineUsersList && currentOnlineUsersList.length > 0) {
        currentOnlineUsersList.forEach(u => onlineMap.set(u.username, u));
    }

    users.forEach(user => {
        if (user.username === currentUser) return;

        const username = user.username;
        const onlineUserData = onlineMap.get(username);
        const isOnline = !!onlineUserData;

        // Filter: If mode is online, MUST be online
        if (mode === 'online' && !isOnline) return;

        const statusClass = isOnline ? 'online' : 'offline';
        const userColor = onlineUserData ? onlineUserData.color : '#ffffff';
        const avatarUrl = user.avatar_url || (onlineUserData ? (onlineUserData.profilePic || DEFAULT_AVATAR) : DEFAULT_AVATAR);
        const targetUid = onlineUserData ? onlineUserData.uid : user.id;
        const uidParam = `'${targetUid}'`;

        // Follow Logic
        const doesFollowMe = currentUserFollowers.has(targetUid);
        const amIFollowing = currentUserFollowing.has(targetUid);
        const isMutual = amIFollowing && doesFollowMe;

        const userDiv = document.createElement('div');
        userDiv.className = 'user-item';

        const isSelf = targetUid === supabaseUser?.id;

        userDiv.innerHTML = `
            <div class="user-avatar-small" style="border-color: ${userColor}; position: relative; width: 40px; height: 40px; border-radius: 50%; border: 2px solid ${userColor}; overflow: visible; margin-right: 15px; cursor: pointer;">
                <img src="${avatarUrl}" onerror="this.src='${DEFAULT_AVATAR}'" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
                <div class="status-dot ${statusClass}" style="position: absolute; bottom: -2px; right: -2px; border: 2px solid #000;"></div>
            </div>
            <div class="user-info" style="flex: 1; cursor: pointer;">
                <div class="user-name" style="color: ${isOnline ? userColor : '#ccc'}; font-weight: bold; font-family: 'Rajdhani', sans-serif; font-size: 1.1rem; display: flex; align-items: center;">
                    ${username}
                    ${isMutual ? '<span class="mutual-badge">Mutual 💜</span>' : ''}
                </div>
                <div class="user-status-text" style="font-size: 0.8rem; color: #888;">
                    ${amIFollowing ? '<span style="color: var(--accent-primary);">Following</span>' : (doesFollowMe ? 'Follows you' : (isOnline ? 'Online now' : 'Offline'))}
                </div>
            </div>
            <div class="user-actions" style="display: flex; gap: 8px;">
                ${(isMutual || isSelf) ?
                `<button class="user-action-btn message-btn dm-trigger-btn" data-username="${username}">
                        <i class="fas fa-comment-alt"></i>
                    </button>` :
                `<button class="user-action-btn message-btn dm-locked" title="Mutual Follow Required" disabled>
                        <i class="fas fa-lock"></i>
                    </button>`
            }
            </div>
        `;

        // Attach event listeners AFTER rendering
        // Profile click - entire row except actions area
        userDiv.addEventListener('click', (e) => {
            if (e.target.closest('.user-actions')) return;
            window.showUserProfile(targetUid);
        });

        // DM button click - only attach if mutual or self
        if (isMutual || isSelf) {
            const dmBtn = userDiv.querySelector('.dm-trigger-btn');
            if (dmBtn) {
                dmBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // openDMByUsername has fresh mutual-follow check as backup
                    window.openDMByUsername(dmBtn.dataset.username);
                });
            }
        }

        // Append to fragment instead of directly to DOM
        fragment.appendChild(userDiv);
    });

    // Clear and batch-append for better performance
    usersList.innerHTML = '';
    usersList.appendChild(fragment);

    // Re-apply search filter
    const searchTerm = document.getElementById('publicUserSearch') ? document.getElementById('publicUserSearch').value.toLowerCase() : '';
    if (searchTerm) filterPublicUserList(searchTerm);
}

function filterPublicUserList(term) {
    const items = document.querySelectorAll('#usersListContainer .user-item');
    items.forEach(item => {
        const nameElement = item.querySelector('.user-name');
        if (nameElement) {
            const name = nameElement.textContent.toLowerCase();
            item.style.display = name.includes(term) ? 'flex' : 'none';
        }
    });
}

window.openDMByUsername = function (username) {
    const user = currentOnlineUsersList.find(u => u.username === username);
    if (user) {
        // Double check mutual follow (safeguard)
        const targetUid = user.uid;
        const doesFollowMe = currentUserFollowers.has(targetUid);
        const amIFollowing = currentUserFollowing.has(targetUid);
        const isMutual = amIFollowing && doesFollowMe;
        const isSelf = targetUid === supabaseUser?.id;

        if (!isMutual && !isSelf) {
            return showNotification('Mutual follow required to start DMs.', 'info');
        }

        openDMWindow(user);
        // Close modal and hamburger if open
        const modal = document.getElementById('onlineUsersModal');
        const hamburger = document.getElementById('userHamburgerMenu');
        if (modal) {
            modal.style.display = 'none'; // Legacy check
            modal.classList.remove('active'); // Current method
        }
        if (hamburger) hamburger.classList.remove('open');
        const hBtn = document.getElementById('userHamburgerBtn');
        if (hBtn) hBtn.classList.remove('active');
    } else {
        showNotification(`User ${username} is not currently available for DM.`, 'info');
    }
}


window.banUser = async function (uid, username) {
    if (!uid) {
        alert("Cannot ban this user: User ID missing (might be a guest or old session). Try Kicking them first.");
        return;
    }

    if (!confirm(`🚫 PERMANENT BAN WARNING 🚫\n\nAre you sure you want to permanently BAN ${username}?\n\nThey will be immediately disconnected and unable to log back in.`)) {
        return;
    }

    try {
        const { error } = await supabase
            .from('profiles')
            .update({ status: 'banned' })
            .eq('id', uid);

        if (error) throw error;

        // Also visual kick
        socket.emit('kick-user', { username: username });
        alert(`${username} has been BANNED.`);

        // Refresh banned users list
        if (typeof fetchBannedUsers === 'function') {
            fetchBannedUsers();
        }

    } catch (err) {
        console.error("Ban Error:", err);
        alert("Failed to ban user: " + err.message);
    }
};

// Fetch all banned users from Supabase
window.fetchBannedUsers = async function () {
    if (!supabase) {
        console.error("Supabase not initialized");
        return;
    }

    try {
        const { data: bannedUsers, error } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, updated_at')
            .eq('status', 'banned')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error("Supabase error fetching banned users:", error);
            console.error("Error details:", JSON.stringify(error, null, 2));
            return;
        }

        console.log("Banned users fetched:", bannedUsers);
        renderBannedUsersList(bannedUsers || []);
    } catch (err) {
        console.error("Error fetching banned users:", err);
        console.error("Error message:", err.message);
        console.error("Error stack:", err.stack);
    }
};

// Render banned users list in developer panel
function renderBannedUsersList(users) {
    const bannedList = document.getElementById('bannedUsersList');
    if (!bannedList) return;

    if (users.length === 0) {
        bannedList.innerHTML = '<div style="color: #888; font-style: italic; padding: 10px;">No banned users</div>';
        return;
    }

    bannedList.innerHTML = '';
    users.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'banned-user-item';
        userDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; margin: 5px 0; background: rgba(0, 0, 0, 0.3); border-radius: 5px;';

        const uidParam = `'${user.id}'`;

        userDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${user.avatar_url || DEFAULT_AVATAR}" 
                     style="width: 30px; height: 30px; border-radius: 50%; border: 2px solid #ff4444;"
                     onerror="this.src='${DEFAULT_AVATAR}'">
                <div>
                    <div style="color: #ff4444; font-weight: bold;">${user.username}</div>
                    <div style="color: #888; font-size: 0.8em;">UID: ${user.id.substring(0, 8)}...</div>
                </div>
            </div>
            <button class="unban-btn" 
                    onclick="unbanUser(${uidParam}, '${user.username}')"
                    style="background: #00ff00; color: #000; padding: 5px 15px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; transition: all 0.2s;">
                UNBAN
            </button>
        `;

        bannedList.appendChild(userDiv);
    });
}

// Unban a user
window.unbanUser = async function (uid, username) {
    if (!confirm(`Unban ${username}?\n\nThey will be able to log in again.`)) {
        return;
    }

    try {
        const { error } = await supabase
            .from('profiles')
            .update({ status: 'normal' })
            .eq('id', uid);

        if (error) throw error;

        alert(`${username} has been UNBANNED.`);

        // Refresh banned users list
        fetchBannedUsers();

    } catch (err) {
        console.error("Unban Error:", err);
        alert("Failed to unban user: " + err.message);
    }
};

function kickUser(username) {
    showCustomConfirm(`Are you sure you want to kick ${username}?`, () => {
        socket.emit('kick-user', { username: username });
    });
}

function openWarnModal(username) {
    document.getElementById('warnUserName').textContent = username;
    document.getElementById('warnReason').value = '';
    warnModal.style.display = 'flex';
}

function closeWarnModal() {
    warnModal.style.display = 'none';
}

// DM System Functions
function initializeDMSystem() {
    const userHamburgerBtn = document.getElementById('userHamburgerBtn');
    const userHamburgerMenu = document.getElementById('userHamburgerMenu');
    const userHamburgerClose = document.getElementById('userHamburgerClose');

    // Show regular user hamburger for everyone
    if (document.getElementById('regularUserControls')) {
        document.getElementById('regularUserControls').style.display = 'block';
    }

    if (userHamburgerBtn && userHamburgerMenu) {
        userHamburgerBtn.addEventListener('click', function (e) {
            e.stopPropagation(); // Prevent document click from immediately closing it
            this.classList.toggle('active');
            userHamburgerMenu.classList.toggle('open');

            if (userHamburgerMenu.classList.contains('open')) {
                requestUsersList();
                // Ensure dev panel is closed if it exists
                if (typeof developerPanel !== 'undefined' && developerPanel) developerPanel.classList.remove('open');
                const hBtn = document.getElementById('hamburgerBtn');
                if (hBtn) hBtn.classList.remove('active');
            }
        });
    }

    if (userHamburgerClose) {
        userHamburgerClose.addEventListener('click', (e) => {
            e.stopPropagation();
            if (userHamburgerMenu) userHamburgerMenu.classList.remove('open');
            if (userHamburgerBtn) userHamburgerBtn.classList.remove('active');
        });
    }

    // Click outside to close
    document.addEventListener('click', function (e) {
        if (userHamburgerMenu && userHamburgerMenu.classList.contains('open')) {
            if (!userHamburgerMenu.contains(e.target) && !userHamburgerBtn.contains(e.target)) {
                userHamburgerBtn.classList.remove('active');
                userHamburgerMenu.classList.remove('open');
            }
        }
    });
}

function requestUsersList() {
    socket.emit('get-users-for-dm');
}

// Render Detailed User List for DM Modal
function displayUsersForDM(users) {
    const container = document.getElementById('usersListContainer');
    if (!container) return;

    container.innerHTML = '';

    // Filter out current user so they can't message themselves
    // Use case-insensitive comparison for robustness
    const otherUsers = users.filter(u => u.username.toLowerCase() !== currentUser.toLowerCase());

    // Update global online count in header (should include yourself)
    if (onlineCount) onlineCount.textContent = users.length;
    // Update badge in the tray bar (should include yourself)
    if (onlineCountBadge) onlineCountBadge.textContent = `${users.length} Online`;

    otherUsers.forEach(user => {
        const targetUid = user.uid;
        const doesFollowMe = currentUserFollowers.has(targetUid);
        const amIFollowing = currentUserFollowing.has(targetUid);
        const isMutual = amIFollowing && doesFollowMe;
        const isSelf = targetUid === supabaseUser?.id;

        // Create the detailed item for the new modal
        const userDiv = document.createElement('div');
        userDiv.className = 'detailed-user-item';

        const profilePic = user.profilePic || DEFAULT_AVATAR;

        userDiv.innerHTML = `
            <img src="${profilePic}" class="user-item-pic">
            <div class="user-item-info">
                <div class="user-item-name" style="color: ${user.color}; cursor: pointer;">
                    ${user.username}
                    ${user.isDeveloper ? '<i class="fas fa-check-circle developer-badge" title="Verified Developer"></i>' : ''}
                    ${isMutual ? '<span class="mutual-badge" style="font-size:0.5rem; padding: 1px 4px;">Mutual</span>' : ''}
                </div>
                <div class="user-item-status">${isMutual ? 'Online' : (doesFollowMe ? 'Follows you' : 'Online')}</div>
            </div>
            <div class="user-item-action">
                ${(isMutual || isSelf) ?
                '<i class="fas fa-comment-dots dm-trigger-icon" style="color: #00C9FF; opacity: 0.7; cursor: pointer;"></i>' :
                '<i class="fas fa-lock" style="opacity: 0.3; font-size: 0.8rem;"></i>'
            }
            </div>
        `;

        // Attach event listeners AFTER rendering
        // Profile click - entire row except action area
        userDiv.addEventListener('click', (e) => {
            if (e.target.closest('.user-item-action')) return;
            window.showUserProfile(targetUid);
        });

        // DM click - only the icon
        if (isMutual || isSelf) {
            const dmIcon = userDiv.querySelector('.dm-trigger-icon');
            if (dmIcon) {
                dmIcon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.openDMWindow(user);
                    onlineUsersModal.classList.remove('active');
                });
            }
        }

        container.appendChild(userDiv);
    });
}
window.displayUsersForDM = displayUsersForDM;

window.openDMWindow = function (user) {
    if (!user) {
        return;
    }

    // Security Safeguard: Mutual follow check
    const targetUid = user.uid || user.id; // Use database UID first, not socket ID

    const doesFollowMe = currentUserFollowers.has(targetUid);
    const amIFollowing = currentUserFollowing.has(targetUid);
    const isMutual = amIFollowing && doesFollowMe;
    const isSelf = targetUid === supabaseUser?.id;

    if (!isMutual && !isSelf) {
        return showNotification('Mutual follow required to start DMs.', 'info');
    }

    // Close hamburger menu
    document.getElementById('userHamburgerBtn').classList.remove('active');
    document.getElementById('userHamburgerMenu').classList.remove('open');

    // Check if window already exists
    if (openDMWindows.has(user.id)) {
        const existingWindow = openDMWindows.get(user.id);
        existingWindow.style.zIndex = dmWindowZIndex++;
        return;
    }

    const dmWindow = document.createElement('div');
    dmWindow.className = 'dm-window';
    dmWindow.style.zIndex = dmWindowZIndex++;


    const firstLetter = user.username.charAt(0).toUpperCase();

    dmWindow.innerHTML = `
        <div class="dm-header">
            <div class="dm-user-info">
                <div class="dm-user-avatar" style="background: ${user.color}">
                    ${firstLetter}
                </div>
                <div class="dm-user-name" style="color: ${user.color}">${user.username}</div>
            </div>
            <div class="dm-controls">
                <button class="dm-home-btn" onclick="minimizeDMWindow('${user.id}')">
                    <i class="fas fa-home"></i>
                </button>
                <button class="dm-close-btn" onclick="closeDMWindow('${user.id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
        <div class="dm-messages" id="dmMessages-${user.id}"></div>
        <div class="dm-typing-indicator" id="dmTyping-${user.id}"></div>
        <div class="dm-input-area">
            <div class="dm-image-preview" id="dmImagePreview-${user.id}" style="display: none;"></div>
            <div class="dm-reply-preview-container" id="dmReply-${user.id}"></div>
            <div class="dm-input-wrapper">
                <button class="dm-gallery-btn" onclick="document.getElementById('dmImageInput-${user.id}').click()">
                    <i class="fas fa-image"></i>
                </button>
                <input type="file" id="dmImageInput-${user.id}" class="dm-image-input" accept="image/*" style="display: none;" onchange="handleDMImageSelection('${user.id}', this)">
                <textarea class="dm-input" id="dmInput-${user.id}" placeholder="Message ${user.username}..." rows="1" maxlength="500"></textarea>
                <button class="dm-send-btn" onclick="sendDMMessage('${user.id}')">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>
    `;

    document.getElementById('dmWindowsContainer').appendChild(dmWindow);
    openDMWindows.set(user.id, dmWindow);

    // Setup DM input events
    setupDMInputEvents(user.id);

    // Load existing messages
    loadDMMessages(user.id);
}

function setupDMInputEvents(userId) {
    const input = document.getElementById(`dmInput-${userId}`);
    let dmTypingTimer = null;
    let isDMTyping = false;

    // Auto-resize textarea
    input.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 80) + 'px';

        // Typing indicator
        if (!isDMTyping && this.value.trim()) {
            isDMTyping = true;
            socket.emit('dm-typing-start', { targetUserId: userId });
        }

        clearTimeout(dmTypingTimer);
        dmTypingTimer = setTimeout(() => {
            if (isDMTyping) {
                isDMTyping = false;
                socket.emit('dm-typing-stop', { targetUserId: userId });
            }
        }, 3000);
    });

    // Enter to send
    input.addEventListener('keypress', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendDMMessage(userId);
        }
    });

    // Paste handler for DM chat
    input.addEventListener('paste', (e) => handlePaste(e, true, userId));

    // Make window draggable

}

function makeDMWindowDraggable(userId) {
    const dmWindow = openDMWindows.get(userId);
    const header = dmWindow.querySelector('.dm-header');

    let isDragging = false;
    let currentX, currentY, initialX, initialY;

    header.addEventListener('mousedown', function (e) {
        if (e.target.closest('button')) return;

        isDragging = true;
        dmWindow.style.zIndex = dmWindowZIndex++;

        initialX = e.clientX - dmWindow.offsetLeft;
        initialY = e.clientY - dmWindow.offsetTop;
    });

    document.addEventListener('mousemove', function (e) {
        if (!isDragging) return;

        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        dmWindow.style.left = Math.max(0, Math.min(currentX, window.innerWidth - dmWindow.offsetWidth)) + 'px';
        dmWindow.style.top = Math.max(0, Math.min(currentY, window.innerHeight - dmWindow.offsetHeight)) + 'px';
    });

    document.addEventListener('mouseup', function () {
        isDragging = false;
    });
}

function sendDMMessage(userId) {
    const input = document.getElementById(`dmInput-${userId}`);
    const message = input.value.trim();
    const selectedImage = selectedDMImages.get(userId);

    if (!message && !selectedImage) return;

    const messageData = {
        targetUserId: userId,
        message: message,
        image: selectedImage,
        timestamp: new Date(),
        messageId: Date.now() + Math.random()
    };

    socket.emit('dm-message', messageData);

    // Play send sound effect
    SoundEffects.messageSent();

    // Add to local messages immediately
    addDMMessageToWindow(userId, {
        ...messageData,
        sender: currentUser,
        isOwn: true,
        status: 'sent'
    });

    input.value = '';
    input.style.height = 'auto';
    removeDMImagePreview(userId);
}

function addDMMessageToWindow(userId, messageData, skipStore = false) {
    const messagesContainer = document.getElementById(`dmMessages-${userId}`);
    if (!messagesContainer) return;

    // Check if message already exists in UI to prevent visual doubling
    if (messagesContainer.querySelector(`[data-message-id="${messageData.messageId}"]`)) {
        return;
    }

    // Store in memory if not skipped
    if (!skipStore) {
        if (!dmMessages.has(userId)) {
            dmMessages.set(userId, []);
        }
        const history = dmMessages.get(userId);
        // Deduplication check for memory
        if (!history.find(m => m.messageId === messageData.messageId)) {
            history.push(messageData);
        }
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `dm-message ${messageData.isOwn ? 'own' : ''}`;
    messageDiv.dataset.messageId = messageData.messageId;

    const timeStr = new Date(messageData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let statusIcon = '';
    if (messageData.isOwn) {
        statusIcon = messageData.status === 'read' ?
            '<i class="fas fa-check-double message-status-double"></i>' :
            '<i class="fas fa-check message-status-single"></i>';
    }

    let contentHtml = parseMessage(messageData.message);

    // Handle Image content
    let imageHtml = '';
    const imageToRender = messageData.image || (messageData.isGIF ? messageData.message : null);

    if (imageToRender) {
        if (messageData.isGIF && !messageData.image) {
            contentHtml = ''; // Clear text if it's a legacy GIF
        }
        imageHtml = `
            <div class="image-thumbnail-wrapper dm-image-thumb media-aesthetic-frame" onclick="openImageViewer('${imageToRender}')">
                <div class="image-loading-overlay">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <img src="${imageToRender}" 
                     class="chat-rendered-image" 
                     onload="this.previousElementSibling.style.opacity='0'; setTimeout(() => this.previousElementSibling.remove(), 500)">
                <div class="media-badge">MEDIA</div>
            </div>
        `;
    }

    messageDiv.innerHTML = `
        <div class="dm-message-bubble">
            ${messageData.isOwn ? `<button class="dm-delete-btn" onclick="deleteDMMessage('${userId}', '${messageData.messageId}')"><i class="fas fa-trash"></i></button>` : ''}
            <div class="dm-message-header">
                <div class="dm-message-time">${timeStr}</div>
                <div class="dm-message-status">${statusIcon}</div>
            </div>
            <div class="dm-message-content">${contentHtml}</div>
            ${imageHtml}
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
    scrollDMToBottom(userId);
}

function scrollDMToBottom(userId) {
    const messagesContainer = document.getElementById(`dmMessages-${userId}`);
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}


function loadDMMessages(userId) {
    const messages = dmMessages.get(userId) || [];
    messages.forEach(msg => addDMMessageToWindow(userId, msg, true));
}

function closeDMWindow(userId) {
    const dmWindow = openDMWindows.get(userId);
    if (dmWindow) {
        dmWindow.style.animation = 'dmWindowSlideOut 0.3s ease-in forwards';
        setTimeout(() => {
            dmWindow.remove();
            openDMWindows.delete(userId);
        }, 300);
    }
}

function minimizeDMWindow(userId) {
    // Return to global chat (hide DM window but keep it in memory)
    closeDMWindow(userId);
}

function deleteDMMessage(userId, messageId) {
    showCustomConfirm('Delete this message?', () => {
        socket.emit('delete-dm-message', {
            to: userId,
            messageId: messageId
        });

        // Remove from UI
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            messageElement.style.animation = 'messageSlideOut 0.3s ease-in forwards';
            setTimeout(() => messageElement.remove(), 300);
        }

        // Remove from local storage
        const messages = dmMessages.get(userId);
        if (messages) {
            const index = messages.findIndex(msg => msg.messageId === messageId);
            if (index > -1) {
                messages.splice(index, 1);
            }
        }
    });
}

function showDMReactionPicker(event, messageElement, userId) {
    selectedMessage = messageElement;

    const rect = messageElement.getBoundingClientRect();
    reactionPicker.style.display = 'block';
    reactionPicker.style.left = Math.min(rect.left, window.innerWidth - 200) + 'px';
    reactionPicker.style.top = (rect.top - reactionPicker.offsetHeight - 10) + 'px';

    // Store DM context
    reactionPicker.dataset.dmUserId = userId;
    reactionPicker.style.animation = 'pickerSlideIn 0.3s ease-out';
}

function handleDMImageSelection(userId, input) {
    const file = input.files[0];
    processMediaFile(file, true, userId);
}

function removeDMImagePreview(userId) {
    selectedDMImages.delete(userId);
    const input = document.getElementById(`dmImageInput-${userId}`);
    if (input) input.value = '';
    const preview = document.getElementById(`dmImagePreview-${userId}`);
    if (preview) {
        preview.style.display = 'none';
        preview.innerHTML = '';
    }
}

function showDMTypingIndicator(userId, username, color) {
    const typingContainer = document.getElementById(`dmTyping-${userId}`);
    if (!typingContainer) return;

    typingContainer.innerHTML = `
        <div class="dm-typing">
            <span style="color: ${color}">${username}</span> is typing
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;
}

function hideDMTypingIndicator(userId) {
    const typingContainer = document.getElementById(`dmTyping-${userId}`);
    if (typingContainer) {
        typingContainer.innerHTML = '';
    }
}
// Smooth close for DM windows
document.addEventListener("click", function (e) {
    if (e.target.closest(".dm-close")) {     // when clicking the close button
        const dmWindow = e.target.closest(".dm-window");
        if (dmWindow) {
            dmWindow.classList.add("closing");  // add slide-out animation
            dmWindow.addEventListener("animationend", () => {
                dmWindow.remove();              // remove after animation finishes
            }, { once: true });
        }
    }
});


// Add message slide out animation
const dmStyle = document.createElement('style');
dmStyle.textContent = `
    @keyframes dmWindowSlideOut {
        0% { opacity: 1; transform: scale(1) translateY(0); }
        100% { opacity: 0; transform: scale(0.8) translateY(50px); }
    }
    
    @keyframes messageSlideOut {
        0% { opacity: 1; transform: translateX(0); }
        100% { opacity: 0; transform: translateX(-50px); }
    }
`;
document.head.appendChild(dmStyle);

// Check for restricted usernames
function isRestrictedUsername(username) {
    const restricted = ['developer', 'DEVELOPER', 'Developer', 'DEVEL0PER', 'devel0per'];
    return restricted.includes(username);
}
// ADD this JavaScript code to your script.js file (append at the end)



// Game state variables
let currentGameState = {
    gameId: null,
    opponent: null,
    mySymbol: null,
    opponentSymbol: null,
    isMyTurn: false,
    board: Array(9).fill(null),
    gameActive: false
};

let challengeTimer = null;

// Initialize Tic-Tac-Toe system
function initializeTicTacToe() {
    // Game container click
    const ticTacToeGame = document.getElementById('ticTacToeGame');
    if (ticTacToeGame) {
        ticTacToeGame.addEventListener('click', function () {
            showTTTOpponentWindow();
        });
    }

    // Opponent window controls
    const tttOpponentBackBtn = document.getElementById('tttOpponentBackBtn');
    if (tttOpponentBackBtn) {
        tttOpponentBackBtn.addEventListener('click', function () {
            hideTTTOpponentWindow();
        });
    }

    // Challenge popup controls
    const challengeAcceptBtn = document.getElementById('challengeAcceptBtn');
    const challengeDeclineBtn = document.getElementById('challengeDeclineBtn');

    if (challengeAcceptBtn) {
        challengeAcceptBtn.addEventListener('click', acceptChallenge);
    }

    if (challengeDeclineBtn) {
        challengeDeclineBtn.addEventListener('click', declineChallenge);
    }

    // Game board clicks
    const tttBoard = document.getElementById('tttBoard');
    if (tttBoard) {
        tttBoard.addEventListener('click', handleBoardClick);
    }

    // Game exit button
    const tttExitBtn = document.getElementById('tttExitBtn');
    if (tttExitBtn) {
        tttExitBtn.addEventListener('click', exitGame);
    }

    // Replay button
    const tttReplayBtn = document.getElementById('tttReplayBtn');
    if (tttReplayBtn) {
        tttReplayBtn.addEventListener('click', requestReplay);
    }

    // Result home button
    const tttResultHomeBtn = document.getElementById('tttResultHomeBtn');
    if (tttResultHomeBtn) {
        tttResultHomeBtn.addEventListener('click', returnToChat);
    }

    // Replay popup controls
    const replayAcceptBtn = document.getElementById('replayAcceptBtn');
    const replayDeclineBtn = document.getElementById('replayDeclineBtn');

    if (replayAcceptBtn) {
        replayAcceptBtn.addEventListener('click', acceptReplay);
    }

    if (replayDeclineBtn) {
        replayDeclineBtn.addEventListener('click', declineReplay);
    }

    // Left popup OK button
    const leftOkBtn = document.getElementById('leftOkBtn');
    if (leftOkBtn) {
        leftOkBtn.addEventListener('click', function () {
            hideTTTLeftPopup();
            returnToChat();
        });
    }
}

// Show opponent selection window
function showTTTOpponentWindow() {
    document.getElementById('userHamburgerMenu').classList.remove('open');
    document.getElementById('userHamburgerBtn').classList.remove('active');
    document.getElementById('tttOpponentWindow').style.display = 'flex';

    // Request users list
    socket.emit('get-ttt-opponents');
}

// Hide opponent selection window
function hideTTTOpponentWindow() {
    document.getElementById('tttOpponentWindow').style.display = 'none';
}

// Display opponents list
function displayTTTOpponents(users) {
    const container = document.getElementById('tttOpponentList');
    container.innerHTML = '';

    users.forEach(user => {
        if (user.username !== currentUser) {
            const opponentDiv = document.createElement('div');
            opponentDiv.className = 'ttt-opponent-item';

            const firstLetter = user.username.charAt(0).toUpperCase();
            const isInGame = user.inGame ? '<i class="fas fa-gamepad user-game-status"></i>' : '';

            opponentDiv.innerHTML = `
                <div class="ttt-opponent-avatar" style="background: ${user.color}">
                    ${firstLetter}
                </div>
                <div class="ttt-opponent-info">
                    <div class="ttt-opponent-name" style="color: ${user.color}">
                        ${user.username}
                        ${user.isDeveloper ? '<i class="fas fa-check-circle developer-badge"></i>' : ''}
                        ${isInGame}
                    </div>
                    <div class="ttt-opponent-status">${user.inGame ? 'In Game' : 'Available'}</div>
                </div>
                <button class="ttt-challenge-btn" data-user-id="${user.id}" ${user.inGame ? 'disabled' : ''}>
                    <i class="fas fa-gamepad"></i> Challenge
                </button>
            `;

            const challengeBtn = opponentDiv.querySelector('.ttt-challenge-btn');
            challengeBtn.addEventListener('click', function () {
                if (!this.disabled) {
                    sendChallenge(user);
                }
            });

            container.appendChild(opponentDiv);
        }
    });

    if (users.filter(u => u.username !== currentUser).length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 15px;"></i>
                <p>No other players online</p>
            </div>
        `;
    }
}

// Send challenge to opponent
function sendChallenge(opponent) {
    // Disable all challenge buttons for 6 seconds
    const allChallengeButtons = document.querySelectorAll('.ttt-challenge-btn');
    allChallengeButtons.forEach(btn => {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-clock"></i> Wait...';
    });

    // Re-enable after 6 seconds
    setTimeout(() => {
        allChallengeButtons.forEach(btn => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-gamepad"></i> Challenge';
        });
    }, 6000);

    // Send challenge to server
    socket.emit('ttt-challenge-sent', {
        opponentId: opponent.id,
        opponentName: opponent.username,
        challengerName: currentUser,
        challengerColor: userColor
    });

    showNotification(`Challenge sent to ${opponent.username}!`, 'info');
}

// Show challenge popup (for challenged player)
function showChallengePopup(data) {
    const popup = document.getElementById('tttChallengePopup');
    document.getElementById('challengerName').textContent = data.challengerName;

    popup.style.display = 'block';

    // Store challenge data
    popup.dataset.challengerId = data.challengerId;
    popup.dataset.challengerName = data.challengerName;
    popup.dataset.challengerColor = data.challengerColor;

    // Auto-hide after 6 seconds
    if (challengeTimer) clearTimeout(challengeTimer);
    challengeTimer = setTimeout(() => {
        hideChallengePopup();
        socket.emit('ttt-challenge-timeout', { challengerId: data.challengerId });
    }, 6000);

    // Play notification sound
    playMessageSound();
}

// Hide challenge popup
function hideChallengePopup() {
    document.getElementById('tttChallengePopup').style.display = 'none';
    if (challengeTimer) {
        clearTimeout(challengeTimer);
        challengeTimer = null;
    }
}

// Accept challenge
function acceptChallenge() {
    const popup = document.getElementById('tttChallengePopup');
    const challengerId = popup.dataset.challengerId;
    const challengerName = popup.dataset.challengerName;
    const challengerColor = popup.dataset.challengerColor;

    hideChallengePopup();

    // Notify server
    socket.emit('ttt-challenge-accepted', {
        challengerId: challengerId,
        accepterName: currentUser,
        accepterColor: userColor
    });
}

// Decline challenge
function declineChallenge() {
    const popup = document.getElementById('tttChallengePopup');
    const challengerId = popup.dataset.challengerId;
    const challengerName = popup.dataset.challengerName;

    hideChallengePopup();

    // Notify server
    socket.emit('ttt-challenge-declined', {
        challengerId: challengerId,
        declinerName: currentUser
    });

    showNotification(`Challenge from ${challengerName} declined`, 'info');
}

// Start game
function startTTTGame(gameData) {
    // Hide all other windows
    hideTTTOpponentWindow();
    document.getElementById('chatScreen').style.display = 'none';

    // Set game state
    currentGameState = {
        gameId: gameData.gameId,
        opponent: gameData.opponent,
        mySymbol: gameData.mySymbol,
        opponentSymbol: gameData.opponentSymbol,
        isMyTurn: gameData.isMyTurn,
        board: Array(9).fill(null),
        gameActive: true
    };

    // Show game window
    const gameWindow = document.getElementById('tttGameWindow');
    gameWindow.style.display = 'flex';

    // Setup player info
    const player1 = gameData.mySymbol === 'X' ?
        { name: currentUser, color: userColor, symbol: 'X' } :
        { name: gameData.opponent.name, color: gameData.opponent.color, symbol: 'X' };

    const player2 = gameData.mySymbol === 'O' ?
        { name: currentUser, color: userColor, symbol: 'O' } :
        { name: gameData.opponent.name, color: gameData.opponent.color, symbol: 'O' };

    document.getElementById('tttPlayer1Avatar').textContent = player1.name.charAt(0).toUpperCase();
    document.getElementById('tttPlayer1Avatar').style.background = player1.color;
    document.getElementById('tttPlayer1Name').textContent = player1.name;
    document.getElementById('tttPlayer1Name').style.color = player1.color;
    document.getElementById('tttPlayer1Symbol').textContent = player1.symbol;

    document.getElementById('tttPlayer2Avatar').textContent = player2.name.charAt(0).toUpperCase();
    document.getElementById('tttPlayer2Avatar').style.background = player2.color;
    document.getElementById('tttPlayer2Name').textContent = player2.name;
    document.getElementById('tttPlayer2Name').style.color = player2.color;
    document.getElementById('tttPlayer2Symbol').textContent = player2.symbol;

    // Reset board
    resetBoard();
    updateTurnIndicator();
}

// Reset board
function resetBoard() {
    currentGameState.board = Array(9).fill(null);
    const cells = document.querySelectorAll('.ttt-cell');
    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('ttt-cell-x', 'ttt-cell-o', 'ttt-cell-disabled', 'winning-cell');
        cell.style.cursor = 'pointer';
        cell.style.opacity = '1';
    });

    // Update turn indicator immediately
    updateTurnIndicator();
}

// Update turn indicator
// Update turn indicator
function updateTurnIndicator() {
    const indicator = document.getElementById('tttTurnIndicator');

    console.log('?? Updating turn indicator. isMyTurn:', currentGameState.isMyTurn);

    if (currentGameState.isMyTurn) {
        indicator.textContent = 'Your Turn!';
        indicator.style.color = '#00ff41';
        indicator.style.textShadow = '0 0 20px #00ff41';
        enableBoard();
        console.log('? Enabled board - YOUR TURN');
    } else {
        indicator.textContent = `${currentGameState.opponent.name}'s Turn...`;
        indicator.style.color = '#ff00ff';
        indicator.style.textShadow = '0 0 20px #ff00ff';
        disableBoard();
        console.log('? Disabled board - OPPONENT TURN');
    }
}
// Handle board click
function handleBoardClick(event) {
    if (!currentGameState.gameActive || !currentGameState.isMyTurn) return;

    const cell = event.target.closest('.ttt-cell');
    if (!cell || cell.classList.contains('ttt-cell-disabled')) return;

    const index = parseInt(cell.dataset.index);
    if (currentGameState.board[index] !== null) return;

    // Make move
    makeMove(index);
}

// Make move
function makeMove(index) {
    console.log('?? Making move at index:', index);

    // Update local board
    currentGameState.board[index] = currentGameState.mySymbol;

    // Update UI immediately
    const cell = document.querySelector(`.ttt-cell[data-index="${index}"]`);
    cell.textContent = currentGameState.mySymbol;
    cell.classList.add(`ttt-cell-${currentGameState.mySymbol.toLowerCase()}`);
    cell.classList.add('ttt-cell-disabled');
    console.log('? Updated my cell', index, 'with', currentGameState.mySymbol);

    // Send move to server
    socket.emit('ttt-move-made', {
        gameId: currentGameState.gameId,
        index: index,
        symbol: currentGameState.mySymbol
    });
    console.log('?? Sent move to server');

    // ? Switch turn to opponent - NOW it's their turn
    currentGameState.isMyTurn = false;
    console.log('? Set isMyTurn to FALSE');

    // Update turn indicator and disable board
    updateTurnIndicator();

    // Check for win/draw
    checkGameResult();
}
// Disable board (prevent clicking during opponent's turn)
function disableBoard() {
    const cells = document.querySelectorAll('.ttt-cell');
    cells.forEach(cell => {
        if (!cell.classList.contains('ttt-cell-disabled')) {
            cell.style.cursor = 'not-allowed';
            cell.style.opacity = '0.6';
        }
    });
}

// Enable board (allow clicking during your turn)
function enableBoard() {
    const cells = document.querySelectorAll('.ttt-cell');
    cells.forEach(cell => {
        if (!cell.classList.contains('ttt-cell-disabled')) {
            cell.style.cursor = 'pointer';
            cell.style.opacity = '1';
        }
    });
}

// Receive opponent's move
function receiveOpponentMove(data) {
    console.log('?? CLIENT: Processing opponent move:', data);

    if (!currentGameState.gameId) {
        console.log('? CLIENT: No active game');
        return;
    }

    if (data.gameId !== currentGameState.gameId) {
        console.log('? CLIENT: Game ID mismatch. Expected:', currentGameState.gameId, 'Got:', data.gameId);
        return;
    }

    if (!currentGameState.gameActive) {
        console.log('? CLIENT: Game is not active');
        return;
    }

    // Update board from server
    currentGameState.board = data.board;
    console.log('? CLIENT: Board synced with server:', currentGameState.board);

    // Update UI for the opponent's move
    const cell = document.querySelector(`.ttt-cell[data-index="${data.index}"]`);
    if (cell) {
        if (cell.classList.contains('ttt-cell-disabled')) {
            console.log('?? CLIENT: Cell already disabled');
        }

        cell.textContent = data.symbol;
        cell.classList.add(`ttt-cell-${data.symbol.toLowerCase()}`);
        cell.classList.add('ttt-cell-disabled');
        console.log('? CLIENT: Updated cell', data.index, 'with', data.symbol);

        // Add animation
        cell.style.animation = 'cellAppear 0.5s ease-out';
    } else {
        console.log('? CLIENT: Cell not found for index', data.index);
    }

    // Now it's my turn
    currentGameState.isMyTurn = true;
    console.log('? CLIENT: Set isMyTurn to TRUE');

    // Update turn indicator and enable board
    updateTurnIndicator();

    // Check for win/draw
    checkGameResult();
}

// Check game result
function checkGameResult() {
    const board = currentGameState.board;
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6]              // Diagonals
    ];

    // Check for winner
    for (let pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            // Winner found
            highlightWinningCells(pattern);
            setTimeout(() => {
                const winner = board[a] === currentGameState.mySymbol ? 'win' : 'lose';
                showGameResult(winner, pattern);
            }, 1000);
            currentGameState.gameActive = false;
            return;
        }
    }

    // Check for draw
    if (!board.includes(null)) {
        setTimeout(() => {
            showGameResult('draw');
        }, 500);
        currentGameState.gameActive = false;
    }
}

// Highlight winning cells
function highlightWinningCells(pattern) {
    pattern.forEach(index => {
        const cell = document.querySelector(`.ttt-cell[data-index="${index}"]`);
        cell.classList.add('winning-cell');
    });
}

// Show game result
function showGameResult(result) {
    document.getElementById('tttGameWindow').style.display = 'none';

    const resultWindow = document.getElementById('tttResultWindow');
    const resultMessage = document.getElementById('tttResultMessage');
    const resultAnimation = document.getElementById('tttResultAnimation');

    resultWindow.style.display = 'flex';
    resultAnimation.innerHTML = '';

    if (result === 'win') {
        resultMessage.textContent = 'YOU WON!';
        resultMessage.className = 'ttt-result-message winner';
        createCelebrationEffects(resultAnimation);
    } else if (result === 'lose') {
        resultMessage.textContent = 'YOU ARE A WARRIOR!';
        resultMessage.className = 'ttt-result-message loser';
        createWarriorEffects(resultAnimation);
    } else {
        resultMessage.textContent = 'IT\'S A DRAW!';
        resultMessage.className = 'ttt-result-message draw';
        createDrawEffects(resultAnimation);
    }
}

// Create celebration effects (for winner)
function createCelebrationEffects(container) {
    // Winner banner
    const banner = document.createElement('div');
    banner.className = 'winner-banner';
    banner.textContent = 'WINNER!';
    container.appendChild(banner);

    // Fireworks
    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            createFirework(container);
        }, i * 100);
    }

    // Confetti
    for (let i = 0; i < 100; i++) {
        setTimeout(() => {
            createConfetti(container);
        }, i * 20);
    }

    // Stars
    for (let i = 0; i < 20; i++) {
        setTimeout(() => {
            createStar(container);
        }, i * 150);
    }

    // Lights
    for (let i = 0; i < 15; i++) {
        setTimeout(() => {
            createLight(container);
        }, i * 200);
    }

    // Stop after 4 seconds
    setTimeout(() => {
        banner.style.animation = 'none';
    }, 4000);
}

// Create firework
function createFirework(container) {
    const colors = ['#ffd700', '#ff00ff', '#00ffff', '#00ff41', '#ff6b6b'];
    const centerX = Math.random() * container.offsetWidth;
    const centerY = Math.random() * (container.offsetHeight * 0.7);

    for (let i = 0; i < 20; i++) {
        const firework = document.createElement('div');
        firework.className = 'celebration-firework';
        firework.style.left = centerX + 'px';
        firework.style.top = centerY + 'px';
        firework.style.background = colors[Math.floor(Math.random() * colors.length)];

        const angle = (Math.PI * 2 * i) / 20;
        const velocity = 50 + Math.random() * 50;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;

        firework.style.setProperty('--tx', tx + 'px');
        firework.style.setProperty('--ty', ty + 'px');

        container.appendChild(firework);

        setTimeout(() => firework.remove(), 1000);
    }
}

// Create confetti
function createConfetti(container) {
    const confetti = document.createElement('div');
    confetti.className = 'celebration-confetti';
    confetti.style.left = Math.random() * container.offsetWidth + 'px';
    confetti.style.top = '-10px';
    confetti.style.background = `hsl(${Math.random() * 360}, 70%, 60%)`;
    confetti.style.animationDelay = Math.random() * 0.5 + 's';

    container.appendChild(confetti);
    setTimeout(() => confetti.remove(), 3000);
}

// Create star
function createStar(container) {
    const star = document.createElement('div');
    star.className = 'celebration-star';
    star.textContent = '?';
    star.style.left = container.offsetWidth / 2 + 'px';
    star.style.top = container.offsetHeight / 2 + 'px';

    const angle = Math.random() * Math.PI * 2;
    const distance = 100 + Math.random() * 150;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;

    star.style.setProperty('--tx', tx + 'px');
    star.style.setProperty('--ty', ty + 'px');

    container.appendChild(star);
    setTimeout(() => star.remove(), 2000);
}

// Create light pulse
function createLight(container) {
    const light = document.createElement('div');
    light.className = 'celebration-light';
    light.style.left = Math.random() * container.offsetWidth + 'px';
    light.style.top = Math.random() * container.offsetHeight + 'px';
    light.style.background = `radial-gradient(circle, ${['#ffd700', '#ff00ff', '#00ffff'][Math.floor(Math.random() * 3)]} 0%, transparent 70%)`;

    container.appendChild(light);
    setTimeout(() => light.remove(), 1000);
}

// Create warrior effects (for loser)
function createWarriorEffects(container) {
    const message = document.createElement('div');
    message.style.cssText = `
        font-size: 1.2rem;
        color: rgba(255,255,255,0.7);
        text-align: center;
        animation: messageFloat 2s ease-in-out infinite;
    `;
    message.textContent = 'Every loss is a lesson. Keep fighting!';
    container.appendChild(message);
}

// Create draw effects
function createDrawEffects(container) {
    const message = document.createElement('div');
    message.style.cssText = `
        font-size: 1.2rem;
        color: rgba(255,255,255,0.7);
        text-align: center;
        animation: messageFloat 2s ease-in-out infinite;
    `;
    message.textContent = 'Well played! Both warriors stood strong!';
    container.appendChild(message);
}

// Request replay
function requestReplay() {
    socket.emit('ttt-replay-request', {
        gameId: currentGameState.gameId,
        requesterName: currentUser
    });

    showNotification('Replay request sent!', 'info');
    document.getElementById('tttReplayBtn').disabled = true;
    document.getElementById('tttReplayBtn').innerHTML = '<i class="fas fa-clock"></i> Waiting...';
}

// Show replay popup
function showReplayPopup(data) {
    const popup = document.getElementById('tttReplayPopup');
    document.getElementById('replayRequesterName').textContent = data.requesterName;

    popup.style.display = 'block';
    popup.dataset.requesterId = data.requesterId;
    popup.dataset.gameId = data.gameId;
}

// Hide replay popup
function hideReplayPopup() {
    document.getElementById('tttReplayPopup').style.display = 'none';
}

// Accept replay
function acceptReplay() {
    const popup = document.getElementById('tttReplayPopup');
    const requesterId = popup.dataset.requesterId;
    const gameId = popup.dataset.gameId;

    hideReplayPopup();

    socket.emit('ttt-replay-accepted', {
        gameId: gameId,
        requesterId: requesterId
    });
}

// Decline replay
function declineReplay() {
    const popup = document.getElementById('tttReplayPopup');
    const requesterId = popup.dataset.requesterId;

    hideReplayPopup();

    socket.emit('ttt-replay-declined', {
        requesterId: requesterId,
        declinerName: currentUser
    });

    showNotification('Replay declined', 'info');
}

// Start replay game
function startReplayGame(gameData) {
    document.getElementById('tttResultWindow').style.display = 'none';
    document.getElementById('tttGameWindow').style.display = 'flex';

    // Reset game state
    currentGameState.board = Array(9).fill(null);
    currentGameState.isMyTurn = gameData.isMyTurn;
    currentGameState.gameActive = true;

    resetBoard();
    updateTurnIndicator();
}

// Exit game
function exitGame() {
    showCustomConfirm('Are you sure you want to leave the game?', () => {
        socket.emit('ttt-player-left', {
            gameId: currentGameState.gameId,
            playerName: currentUser
        });

        returnToChat();
    });
}

// Show left popup
function showTTTLeftPopup(data) {
    const popup = document.getElementById('tttLeftPopup');
    document.getElementById('leftPlayerName').textContent = data.playerName;
    popup.style.display = 'block';
}

// Hide left popup
function hideTTTLeftPopup() {
    document.getElementById('tttLeftPopup').style.display = 'none';
}

// Return to chat
function returnToChat() {
    document.getElementById('tttGameWindow').style.display = 'none';
    document.getElementById('tttResultWindow').style.display = 'none';
    document.getElementById('tttOpponentWindow').style.display = 'none';
    document.getElementById('chatScreen').style.display = 'flex';

    // Reset game state
    currentGameState = {
        gameId: null,
        opponent: null,
        mySymbol: null,
        opponentSymbol: null,
        isMyTurn: false,
        board: Array(9).fill(null),
        gameActive: false
    };
    console.log('?? Game started!');
    console.log('My symbol:', currentGameState.mySymbol);
    console.log('Opponent symbol:', currentGameState.opponentSymbol);
    console.log('Is my turn:', currentGameState.isMyTurn);
    console.log('Opponent:', currentGameState.opponent.name);
    // Notify server
    socket.emit('ttt-game-ended');
}

// ===== SOCKET EVENTS FOR TIC-TAC-TOE =====

// Socket event: Receive opponents list
socket.on('ttt-opponents-list', function (users) {
    displayTTTOpponents(users);
});

// Socket event: Receive challenge
socket.on('ttt-challenge-received', function (data) {
    showChallengePopup(data);
});

// Socket event: Challenge declined
socket.on('ttt-challenge-declined', function (data) {
    showNotification(`${data.declinerName} declined your challenge`, 'info');
});

// Socket event: Challenge timeout
socket.on('ttt-challenge-timeout', function () {
    showNotification('Challenge expired', 'info');
});

// Socket event: Game started
socket.on('ttt-game-started', function (data) {
    console.log('?? CLIENT: Game started event received!', data);
    startTTTGame(data);
});

// ? THIS IS THE CRITICAL ONE - Make sure it exists!
socket.on('ttt-opponent-move', function (data) {
    console.log('?? CLIENT: Opponent move received!', data);
    receiveOpponentMove(data);
});

// Socket event: Replay request received
socket.on('ttt-replay-request-received', function (data) {
    showReplayPopup(data);
});

// Socket event: Replay declined
socket.on('ttt-replay-declined', function (data) {
    showNotification(`${data.declinerName} declined the replay`, 'info');
    document.getElementById('tttReplayBtn').disabled = false;
    document.getElementById('tttReplayBtn').innerHTML = '<i class="fas fa-redo"></i> Play Again';
});

// Socket event: Replay accepted
socket.on('ttt-replay-accepted', function (data) {
    startReplayGame(data);
});

// Socket event: Opponent left
socket.on('ttt-opponent-left', function (data) {
    currentGameState.gameActive = false;
    showTTTLeftPopup(data);
});

// Socket event: Update user game status
socket.on('user-game-status-updated', function (data) {
    console.log('?? Game status update:', data);
});

// Socket event: Update user game status
socket.on('user-game-status-updated', function (data) {
    // Update user list with game status icons
    const userElements = document.querySelectorAll('.user-list-item, .ttt-opponent-item');
    userElements.forEach(element => {
        const nameElement = element.querySelector('.user-list-name, .ttt-opponent-name');
        if (nameElement && nameElement.textContent.includes(data.username)) {
            // Remove existing game status
            const existingStatus = element.querySelector('.user-game-status');
            if (existingStatus) existingStatus.remove();

            // Add new game status if in game
            if (data.inGame) {
                const statusIcon = document.createElement('i');
                statusIcon.className = 'fas fa-gamepad user-game-status';
                statusIcon.title = 'In Game';
                nameElement.appendChild(statusIcon);
            }
        }
    });
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    initializeTicTacToe();
});


// Clean up on page unload
window.addEventListener('beforeunload', function () {
    if (currentGameState.gameActive) {
        socket.emit('ttt-player-left', {
            gameId: currentGameState.gameId,
            playerName: currentUser
        });
    }
});

console.log('? Tic-Tac-Toe system initialized!');

// Auth Functions
async function handleGoogleLogin() {
    console.log("DEBUG: Google Login Clicked");
    if (!supabase) {
        console.error("DEBUG: Supabase client not initialized yet");
        alert("System still initializing... please wait a moment.");
        return;
    }

    try {
        console.log("DEBUG: Starting signInWithOAuth...");
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) {
            console.error("DEBUG: signInWithOAuth Error:", error);
            throw error;
        }
        console.log("DEBUG: Redirect initiated success:", data);
        // Redirect happens automatically
    } catch (error) {
        console.error("Critical Google Login Failed:", error);
        alert("Login failed: " + (error.message || "Unknown error"));
    }
}

async function handleCreateAccount() {
    const username = newUsernameInput.value.trim();
    const password = newPasswordInput.value.trim();
    const bio = newUserBioInput.value.trim() || "write something about uh.";
    const profilePicFile = profilePicInput.files[0];

    // Require password for EVERYONE (Google or Manual)
    if (username.length < 3 || password.length < 6) {
        alert("Username must be at least 3 chars and password 6 chars.");
        return;
    }

    // Show Premium Loader immediately
    showAuthLoader("INITIALIZING PROFILE CREATION...", 20000);
    createAccountBtn.disabled = true;

    try {
        // 1. Check if username is taken
        const { data: existingUser, error: checkError } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', username)
            .maybeSingle();

        if (existingUser) {
            alert("Username already taken. Please choose another.");
            resetCreateAccountBtn();
            hideAuthLoader();
            return;
        }

        let uid;
        let email;

        if (supabaseUser) {
            console.log("Using Google Session.");
            uid = supabaseUser.id;
            email = supabaseUser.email;
        } else {
            console.log("Creating new Email/Password User...");
            email = `${username.toLowerCase().replace(/\s+/g, "")}@drixs.chat`;
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: email,
                password: password
            });

            if (signUpError) throw signUpError;
            if (!authData.user) throw new Error("Account creation failed");

            // CHECK FOR MISSING SESSION
            if (!authData.session && !supabaseUser) {
                console.error("No session returned. Email confirmation likely enabled.");
                alert("Account created but NO SESSION. Please disable Email Confirmations in Supabase.");
                resetCreateAccountBtn();
                hideAuthLoader();
                return;
            }

            uid = authData.user.id;
        }

        let profilePicUrl = DEFAULT_AVATAR;

        // 3. Upload Profile Pic
        if (profilePicFile) {
            const fileName = `${uid}/${Date.now()}.jpg`;
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, profilePicFile);

            if (!uploadError) {
                const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
                profilePicUrl = urlData.publicUrl;
            }
        }

        // 4. Create Profile
        const profileData = {
            id: uid,
            username: username,
            bio: bio,
            avatar_url: profilePicUrl,
            status: 'normal',
            email: email,
            password: password
        };

        const { error: profileError } = await supabase.from('profiles').insert(profileData);

        if (profileError) {
            console.error("Profile Insert Error:", profileError);
            throw new Error("Database Save Failed: " + profileError.message);
        }

        // Success - Strict Transition Logic
        console.log("Profile created! Transitioning to chat...");
        currentUser = username;
        currentUserBio = bio;
        currentUserProfilePic = profilePicUrl;

        // Force UI State
        const profileSetupContainer = document.getElementById('profileSetupContainer');
        const welcomeScreen = document.getElementById('welcomeScreen');

        if (profileSetupContainer) profileSetupContainer.style.display = 'none';
        if (welcomeScreen) welcomeScreen.classList.remove('active');

        // Ensure Chat Screen is active (handled by startChat usually, but double safety)
        if (chatScreen) chatScreen.classList.add('active');

        // Explicitly start chat to trigger socket connection and final UI setup
        startChat();

        // Background Password Update
        if (supabaseUser) {
            supabase.auth.updateUser({ password: password }).then(() => console.log("Password synced."));
        }

    } catch (error) {
        console.error("Account Creation Failed:", error);
        alert("Error creating account: " + error.message);
        resetCreateAccountBtn();
        hideAuthLoader();
    }
}

function resetCreateAccountBtn() {
    createAccountBtn.disabled = false;
    createAccountBtn.innerHTML = `
        <div class="btn-bg"></div>
        <div class="btn-glow"></div>
        <span class="btn-text">
            <i class="fas fa-user-plus"></i>
            CREATE ACCOUNT
        </span>
        <div class="btn-particles"></div>
    `;
}

async function handleStandardLogin() {
    const username = document.getElementById('loginUsernameInput').value.trim();
    const password = document.getElementById('loginPasswordInput').value.trim();
    const loginSubmitBtn = document.getElementById('loginSubmitBtn');

    if (username.length < 3 || password.length < 6) return;

    loginSubmitBtn.innerHTML = '<div class="loading-spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>';
    loginSubmitBtn.disabled = true;

    try {
        console.log("DEBUG: Login Clicked. Starting...");
        console.log("DEBUG: Supabase client exists?", !!supabase);

        // 1. Create a temporary, CLEAN client just for lookup to bypass ANY session hangs
        const configResp = await fetch(`/config?t=${Date.now()}`);
        const config = await configResp.json();
        const tempClient = createClient(config.supabaseUrl, config.supabaseKey, {
            auth: { persistSession: false }
        });

        // Add timeout to detect hanging queries
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Query timeout after 8 seconds")), 8000)
        );

        // 2. Real Query with timeout using the TEMP client
        const queryPromise = tempClient
            .from('profiles')
            .select('email')
            .eq('username', username)
            .limit(1);

        console.log("DEBUG: Starting query race (using temp client)...");
        const { data: profiles, error: profileError } = await Promise.race([
            queryPromise,
            timeoutPromise
        ]);

        console.log("DEBUG: Profile Lookup Result (from temp):", profiles, profileError);

        if (profileError) {
            showCustomError("Database Error", profileError.message);
            resetLoginButton();
            return;
        }

        const profile = profiles && profiles.length > 0 ? profiles[0] : null;

        if (!profile) {
            showCustomError("Login Failed", "Username not found. Please check your credentials.");
            resetLoginButton();
            return;
        }

        const email = profile.email;
        if (!email) {
            showCustomError("Account Error", "This account has no email linked. Please contact support.");
            resetLoginButton();
            return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            console.error("Supabase Login Error:", error);
            throw error;
        }

        // Success - Auth listener will handle UI transition and startChat()
        console.log("Login Successful! Auth listener will take over.");

    } catch (error) {
        console.error("Login Error:", error);
        showCustomError("Login Failed", error.message || "An unexpected error occurred. Please try again.");
        resetLoginButton();
    }
}

function resetLoginButton() {
    const loginSubmitBtn = document.getElementById('loginSubmitBtn');
    if (loginSubmitBtn) {
        loginSubmitBtn.innerHTML = `
            <div class="btn-bg"></div>
            <div class="btn-glow"></div>
            <span class="btn-text">
                <i class="fas fa-arrow-right"></i>
                LOG IN
            </span>
        `;
        loginSubmitBtn.disabled = false;
        loginSubmitBtn.classList.remove('loading');
    }
}

function toggleDMEmojis(userId) {
    const input = document.getElementById(`dmInput-${userId}`);
    if (input) {
        input.value += "??";
        input.focus();
    }
}

// Global Exports
window.sendDMMessage = sendDMMessage;
window.closeDMWindow = closeDMWindow;
window.minimizeDMWindow = minimizeDMWindow;
window.toggleDMEmojis = toggleDMEmojis;
window.handleDMImageSelection = handleDMImageSelection;
window.removeDMImagePreview = removeDMImagePreview;
window.deleteDMMessage = deleteDMMessage;
window.kickUser = kickUser;
window.openWarnModal = openWarnModal;

// Ban System & Real-time Listener
let profileSubscription = null;


function setupBanListener(uid) {
    if (profileSubscription) {
        supabase.removeChannel(profileSubscription);
    }

    profileSubscription = supabase
        .channel('public:profiles')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${uid}` }, (payload) => {
            const newData = payload.new;
            if (newData.status === 'banned') {
                alert('Your account has been banned. You will be disconnected.');
                supabase.auth.signOut().then(() => window.location.reload());
            }
            // Also update local profile info if it changed
            if (newData.username) currentUser = newData.username;
            if (newData.bio) currentUserBio = newData.bio;
            if (newData.avatar_url) currentUserProfilePic = newData.avatar_url;
        })
        .subscribe();
}

async function handleUpdateProfile() {
    const newUsername = editUsernameInput.value.trim();
    const newBio = editBioInput.value.trim();
    const newPicFile = editProfilePicInput.files[0];

    if (newUsername.length < 3) {
        alert("Username must be at least 3 characters.");
        return;
    }

    saveProfileBtn.disabled = true;
    saveProfileBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SAVING...';

    try {
        const uid = supabaseUser.id;
        let newPicUrl = currentUserProfilePic;

        if (currentUserCroppedBlob || newPicFile) {
            const fileToUpload = currentUserCroppedBlob || newPicFile;
            const fileName = `${uid}/${Date.now()}.jpg`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, fileToUpload);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
            newPicUrl = urlData.publicUrl;
            currentUserCroppedBlob = null;
        }

        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                username: newUsername,
                bio: newBio,
                avatar_url: newPicUrl
            })
            .eq('id', uid);

        if (updateError) throw updateError;

        // Update local state
        currentUser = newUsername;
        currentUserBio = newBio;
        currentUserProfilePic = newPicUrl;

        socket.emit('update-profile', {
            username: newUsername,
            profilePic: newPicUrl,
            bio: newBio
        });

        alert('Profile updated successfully!');
        settingsModal.classList.remove('active');

    } catch (error) {
        console.error("Update Profile Error:", error);
        alert("Failed to update profile: " + error.message);
    } finally {
        saveProfileBtn.disabled = false;
        saveProfileBtn.innerHTML = '<div class="btn-bg"></div><span>SAVE CHANGES</span>';
    }
}




window.showUserProfile = async function (uid) {
    if (!uid) return;

    // Show Loader First
    if (profileLoaderOverlay) profileLoaderOverlay.classList.add('active');
    userProfileModal.classList.add('active');

    // Store active UID for real-time updates
    viewProfileUsername.dataset.activeuid = uid;

    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', uid)
            .single();

        if (profile) {
            viewProfilePic.src = profile.avatar_url || DEFAULT_AVATAR;
            viewProfileUsername.textContent = profile.username;
            viewProfileBio.textContent = profile.bio || "Write something about uh.";

            // Follow System Integration (Parallel)
            updateFollowButtonUI(uid);
            updateProfileStats(uid).finally(() => {
                // Hide loader once core info is loaded
                if (profileLoaderOverlay) profileLoaderOverlay.classList.remove('active');
            });

            // Handle Stats Clicks (Cyclic Navigation)
            const followersStat = document.getElementById('viewFollowersStat');
            const followingStat = document.getElementById('viewFollowingStat');

            followersStat.onclick = () => openFollowList('followers', uid, `${profile.username}'s Followers`);
            followingStat.onclick = () => openFollowList('following', uid, `${profile.username}'s Following`);

            // Follow Button Listener
            if (followUserBtn) {
                followUserBtn.onclick = () => toggleFollow(uid, profile.username);
            }
        } else {
            if (profileLoaderOverlay) profileLoaderOverlay.classList.remove('active');
            alert('User profile not found');
        }
    } catch (error) {
        if (profileLoaderOverlay) profileLoaderOverlay.classList.remove('active');
        console.error("Show Profile Error:", error);
    }
}


function handleLogout() {
    console.warn("handleLogout function entered - showing custom modal");
    showCustomConfirm('Are you sure you want to logout?', () => {
        console.log("Custom confirm accepted, calling signOut");

        // Mark intentional logout to prevent auto-login
        localStorage.setItem('intentionalLogout', 'true');

        // INSTANT VISUAL FEEDBACK
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bye...';
            logoutBtn.style.opacity = '0.7';
            logoutBtn.style.pointerEvents = 'none';
        }

        // Sign out and clear all data
        supabase.auth.signOut().then(() => {
            console.log("Sign out successful, clearing session...");
            // Clear all cached data
            sessionStorage.clear();
            // Reload to welcome screen
            window.location.reload();
        }).catch((error) => {
            console.error('Logout error:', error);
            // Clear anyway
            sessionStorage.clear();
            window.location.reload();
        });
    });
}

// Supabase Auth State Listener
function setupAuthListener() {
    if (!supabase) return;

    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth event:', event, 'Session:', !!session);

        supabaseUser = session?.user || null;

        // Handle SIGNED_OUT event - user logged out intentionally
        if (event === 'SIGNED_OUT') {
            console.log('User signed out, staying on welcome screen');
            // Clear any logout flag after handling
            localStorage.removeItem('intentionalLogout');
            return; // Stay on welcome screen
        }

        // Check if this is an intentional logout (prevents auto-login after logout)
        const wasIntentionalLogout = localStorage.getItem('intentionalLogout');
        if (wasIntentionalLogout && !supabaseUser) {
            console.log('Intentional logout detected, clearing flag');
            localStorage.removeItem('intentionalLogout');
            return; // Don't auto-login
        }

        if (supabaseUser) {
            // User is logged in - Check Profile
            try {
                // Add timeout to prevent hanging on profile fetch
                const profileTimeout = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Profile fetch timeout")), 10000)
                );

                const { data: profiles, error } = await Promise.race([
                    supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', supabaseUser.id)
                        .limit(1),
                    profileTimeout
                ]);

                const profile = profiles && profiles.length > 0 ? profiles[0] : null;

                if (profile) {
                    // CRITICAL: Check Ban Status FIRST before any login
                    if (profile.status === 'banned') {
                        console.log('Banned user detected, signing out');
                        localStorage.setItem('bannedUser', 'true');
                        await supabase.auth.signOut();
                        alert('You have been banned. Access denied.');
                        window.location.reload();
                        return;
                    }

                    // Check if user was kicked (optional - implement if you track kicks in profile)
                    // This requires adding a 'kicked' field to profiles or a separate kicks table

                    // Sync Email if missing (e.g. from Google Login first time)
                    if (!profile.email && supabaseUser.email) {
                        await supabase
                            .from('profiles')
                            .update({ email: supabaseUser.email })
                            .eq('id', supabaseUser.id);
                    }

                    // Restore Session Data
                    currentUser = profile.username;
                    currentUserBio = profile.bio;
                    currentUserProfilePic = profile.avatar_url || DEFAULT_AVATAR;

                    // Setup Listeners
                    setupBanListener(supabaseUser.id);
                    await fetchUserFollowData(); // Load follow system data
                    setupFollowRealtime(); // Enable real-time sync for follows

                    // Initialize Chat
                    // Hide Welcome / Auth screens
                    const welcomeScreen = document.getElementById('welcomeScreen');
                    const googleLoginContainer = document.getElementById('googleLoginContainer');
                    const loginFormContainer = document.getElementById('loginFormContainer');
                    const authOptionsContainer = document.getElementById('authOptionsContainer');

                    if (welcomeScreen) welcomeScreen.classList.remove('active');
                    if (googleLoginContainer) googleLoginContainer.style.display = 'none';
                    if (loginFormContainer) loginFormContainer.style.display = 'none';
                    if (authOptionsContainer) authOptionsContainer.style.display = 'none';

                    startChat();

                } else {
                    // User logged in but no profile -> Show Setup
                    const googleLoginContainer = document.getElementById('googleLoginContainer');
                    const authOptionsContainer = document.getElementById('authOptionsContainer');
                    const profileSetupContainer = document.getElementById('profileSetupContainer');

                    if (googleLoginContainer) googleLoginContainer.style.display = 'none';
                    if (authOptionsContainer) authOptionsContainer.style.display = 'none'; // Ensure main container is hidden

                    if (profileSetupContainer) {
                        profileSetupContainer.style.display = 'block';
                        if (window.nextWizardStep) window.nextWizardStep(1);
                    }
                }
            } catch (err) {
                console.error("Auth State Check Error:", err);
            }
        }
        // Note: If no user, we stay on Welcome Screen (default HTML state)
    });
}


// Global Exports
window.showUserProfile = showUserProfile;
window.sendDMMessage = sendDMMessage;
window.closeDMWindow = closeDMWindow;
window.minimizeDMWindow = minimizeDMWindow;
window.toggleDMEmojis = toggleDMEmojis;

// Setup Wizard Logic
window.nextWizardStep = function (step) {
    // Validation
    if (step === 2) {
        const u = document.getElementById('newUsernameInput').value.trim();
        if (!u || u.length < 3) {
            alert("Username must be at least 3 characters!");
            return;
        }
    }
    if (step === 3) {
        const p = document.getElementById('newPasswordInput').value.trim();
        if (!p || p.length < 6) {
            alert("Password must be at least 6 characters!");
            return;
        }
    }

    // Hide all steps
    document.querySelectorAll('.wizard-step').forEach(el => {
        el.classList.remove('active');
        el.style.display = 'none';
    });

    // Show target step
    const target = document.getElementById('wizardStep' + step);
    if (target) {
        target.classList.add('active');
        target.style.display = 'block';
    }

    // Update Dots
    document.querySelectorAll('.step-dot').forEach(d => {
        const s = parseInt(d.getAttribute('data-step'));
        d.classList.remove('active', 'completed');
        if (s === step) d.classList.add('active');
        if (s < step) d.classList.add('completed');
    });

    // Update Lines
    const lines = document.querySelectorAll('.step-line');
    lines.forEach((l, index) => {
        if (index < step - 1) l.classList.add('active');
        else l.classList.remove('active');
    });

    // Enable/Disable Finish Button
    const finishBtn = document.getElementById('createAccountBtn');
    if (finishBtn) {
        if (step === 4) finishBtn.removeAttribute('disabled');
        // else finishBtn.setAttribute('disabled', 'true'); // Not strictly needed if not visible
    }
};
// window.handleGIFUpload = handleGIFUpload; // Removed - function no longer exists
window.deleteDMMessage = deleteDMMessage;
window.kickUser = kickUser;
window.openWarnModal = openWarnModal;
window.handleLogout = handleLogout;
window.openDMByUsername = openDMByUsername;

// Settings Window Handlers
document.addEventListener('DOMContentLoaded', function () {
    const openSettingsBtn = document.getElementById('openSettingsBtn');
    const settingsWindow = document.getElementById('settingsWindow');
    const settingsBackBtn = document.getElementById('settingsBackBtn');
    const userHamburgerMenu = document.getElementById('userHamburgerMenu');

    // Open Settings Window
    if (openSettingsBtn) {
        openSettingsBtn.addEventListener('click', function () {
            settingsWindow.classList.add('active');
            userHamburgerMenu.classList.remove('open'); // Close hamburger menu
        });
    }

    // Close Settings Window (Back button)
    if (settingsBackBtn) {
        settingsBackBtn.addEventListener('click', function () {
            settingsWindow.classList.remove('active');
            userHamburgerMenu.classList.add('open'); // Reopen hamburger menu
            const openSettingsBtn = document.getElementById('userHamburgerBtn');
            if (openSettingsBtn) openSettingsBtn.classList.add('active');
        });
    }

    // Tic-Tac-Toe Navigation Fix
    const tttOpponentBackBtn = document.getElementById('tttOpponentBackBtn');
    if (tttOpponentBackBtn) {
        tttOpponentBackBtn.addEventListener('click', () => {
            const tttWindow = document.getElementById('tttOpponentWindow');
            if (tttWindow) tttWindow.classList.remove('active');

            // Re-open hamburger
            const menu = document.getElementById('userHamburgerMenu');
            if (menu) menu.classList.add('open');
            const btn = document.getElementById('userHamburgerBtn');
            if (btn) btn.classList.add('active');
        });
    }

    // Theme Toggle Card
    const themeToggleCard = document.getElementById('themeToggleCard');
    if (themeToggleCard) {
        themeToggleCard.addEventListener('click', function () {
            toggleTheme();
        });
    }

    // Edit Profile Card - Open existing unique Profile Editor (which was called settingsModal)
    const editProfileBtnCard = document.getElementById('editProfileBtnCard');
    const settingsModal = document.getElementById('settingsModal');

    if (editProfileBtnCard) {
        editProfileBtnCard.addEventListener('click', function () {
            // Close the new settings window
            settingsWindow.classList.remove('active');

            // Open the existing Profile Edit modal
            if (settingsModal) {
                settingsModal.classList.add('active');

                // Populate current values using the correct global variables
                try {
                    const nameInput = document.getElementById('editUsernameInput');
                    const bioInput = document.getElementById('editBioInput');
                    const picPreview = document.getElementById('editProfilePicPreview');

                    // Variables are global strings: currentUser(name), currentUserBio, currentUserProfilePic
                    if (nameInput) nameInput.value = (typeof currentUser === 'string' ? currentUser : '');
                    if (bioInput) bioInput.value = (typeof currentUserBio === 'string' ? currentUserBio : '');
                    if (picPreview) picPreview.src = (typeof currentUserProfilePic === 'string' && currentUserProfilePic) ? currentUserProfilePic : 'default-avatar.png';
                } catch (e) {
                    console.error("Error populating profile data:", e);
                }
            } else {
                console.error("Original settingsModal not found!");
            }
        });
    }

    // Logout Card - Use existing handleLogout() for custom popup
    const logoutBtnCard = document.getElementById('logoutBtnCard');
    if (logoutBtnCard) {
        logoutBtnCard.addEventListener('click', function () {
            if (typeof handleLogout === 'function') {
                handleLogout(); // Uses the custom confirm popup
            } else {
                // Fallback
                if (confirm('Are you sure you want to logout?')) {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                }
            }
        });
    }

    // Follow List Modal Listeners
    if (followListClose) {
        followListClose.addEventListener('click', closeFollowList);
    }
    if (followListBack) {
        followListBack.addEventListener('click', closeFollowList); // Simple back for now
    }
});

// ================= FOLLOW SYSTEM LOGIC =================

// Real-time Follow Sync
function setupFollowRealtime() {
    if (!supabase || !supabaseUser) return;

    // Listen for changes in follows table
    supabase
        .channel('public:follows')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'follows'
        }, async (payload) => {
            console.log('Follow change detected:', payload);

            const { eventType, new: newRecord, old: oldRecord } = payload;

            // Use the available data. For DELETE, we rely on replica identity full
            const data = (eventType === 'DELETE') ? oldRecord : newRecord;
            if (!data) return;

            // If it involves the current user OR the user currently being viewed
            const activeUid = viewProfileUsername?.dataset?.activeuid;
            const isRelevant = (data.follower_id === supabaseUser.id) ||
                (data.following_id === supabaseUser.id) ||
                (activeUid && (data.follower_id === activeUid || data.following_id === activeUid));

            if (isRelevant) {
                // Re-fetch everything for accuracy
                await fetchUserFollowData();

                // Refresh active profile if open
                if (userProfileModal.classList.contains('active')) {
                    if (activeUid) updateProfileStats(activeUid);
                }

                // Refresh Lists immediately
                if (currentUserListTab === 'global') fetchGlobalUsers();
                if (typeof requestOnlineUsers === 'function') requestOnlineUsers();
            }
        })
        .subscribe();
}

async function fetchUserFollowData() {
    if (!supabaseUser) return;
    try {
        const { data: following, error: fErr } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', supabaseUser.id);

        const { data: followers, error: rErr } = await supabase
            .from('follows')
            .select('follower_id')
            .eq('following_id', supabaseUser.id);

        if (fErr || rErr) throw (fErr || rErr);

        currentUserFollowing = new Set((following || []).map(f => f.following_id));
        currentUserFollowers = new Set((followers || []).map(f => f.follower_id));

        console.log("Follow data updated:", { following: currentUserFollowing.size, followers: currentUserFollowers.size });
        updateMyStatsDisplay();

    } catch (error) {
        console.error("Error fetching follow data:", error);
    }
}

function updateMyStatsDisplay() {
    // Also try to find elements dynamically in case they were replaced or are in a specific scope
    const followersEl = document.getElementById('myFollowersCount');
    const followingEl = document.getElementById('myFollowingCount');

    if (followersEl) followersEl.textContent = currentUserFollowers.size;
    if (followingEl) followingEl.textContent = currentUserFollowing.size;

    // Log for debugging
    console.log("Settings stats updated:", {
        followers: currentUserFollowers.size,
        following: currentUserFollowing.size
    });
}

async function toggleFollow(targetId, targetUsername) {
    if (!supabaseUser) return showNotification("Please login to follow users", "error");
    if (targetId === supabaseUser.id) return;

    const isFollowing = currentUserFollowing.has(targetId);

    // OPTIMISTIC UPDATE
    if (isFollowing) {
        currentUserFollowing.delete(targetId);
    } else {
        currentUserFollowing.add(targetId);
    }

    // Update UI Instantly
    updateFollowButtonUI(targetId);

    // Optimistically update the stats count if viewing that profile
    const activeUid = viewProfileUsername?.dataset?.activeuid;
    if (activeUid === targetId && viewFollowersCount) {
        let currentCount = parseInt(viewFollowersCount.textContent) || 0;
        viewFollowersCount.textContent = isFollowing ? Math.max(0, currentCount - 1) : currentCount + 1;
    }

    if (followUserBtn) followUserBtn.classList.add('loading');

    try {
        if (isFollowing) {
            // Unfollow
            const { error } = await supabase
                .from('follows')
                .delete()
                .eq('follower_id', supabaseUser.id)
                .eq('following_id', targetId);

            if (error) throw error;
            showNotification(`Unfollowed ${targetUsername}`, "info");
        } else {
            // Follow
            const { error } = await supabase
                .from('follows')
                .insert({
                    follower_id: supabaseUser.id,
                    following_id: targetId
                });

            if (error) throw error;
            showNotification(`Following ${targetUsername}`, "success");
        }

        // Final sync for accuracy (handles stats and secondary UI)
        await updateProfileStats(targetId);
        await fetchUserFollowData(); // Sync total counts

        // Refresh User Lists to update DM locks
        if (currentUserListTab === 'global') fetchGlobalUsers();
        else {
            if (typeof requestOnlineUsers === 'function') requestOnlineUsers();
            else fetchGlobalUsers();
        }

    } catch (error) {
        console.error("Toggle Follow Error:", error);
        showNotification("Failed to update follow status", "error");

        // ROLLBACK
        if (isFollowing) {
            currentUserFollowing.add(targetId);
        } else {
            currentUserFollowing.delete(targetId);
        }
        updateFollowButtonUI(targetId);
        await updateProfileStats(targetId);
    } finally {
        if (followUserBtn) followUserBtn.classList.remove('loading');
    }
}

function updateFollowButtonUI(uid) {
    if (!followUserBtn) return;
    const isFollowing = currentUserFollowing.has(uid);

    if (isFollowing) {
        followUserBtn.classList.add('following');
        followUserBtn.innerHTML = '<i class="fas fa-user-minus"></i> <span>UNFOLLOW</span>';
    } else {
        followUserBtn.classList.remove('following');
        followUserBtn.innerHTML = '<i class="fas fa-user-plus"></i> <span>FOLLOW</span>';
    }

    // Hide for self
    followUserBtn.style.display = (uid === supabaseUser?.id) ? 'none' : 'flex';
}

async function updateProfileStats(uid) {
    try {
        // Fetch Counts
        const { count: followersCount } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', uid);

        const { count: followingCount } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', uid);

        if (viewFollowersCount) viewFollowersCount.textContent = followersCount || 0;
        if (viewFollowingCount) viewFollowingCount.textContent = followingCount || 0;

        // Contextual Badge (Mutual, Follows You)
        const isFollowingMe = currentUserFollowers.has(uid);
        const amIFollowing = currentUserFollowing.has(uid);

        let contextHTML = '';
        let dmGuidanceHTML = '';

        if (isFollowingMe && amIFollowing) {
            contextHTML = '<span class="mutual-badge">Mutual ??</span>';
        } else if (isFollowingMe) {
            contextHTML = '<span class="follows-you-tag">Follows you</span>';
        }

        const isMutual = isFollowingMe && amIFollowing;

        // DM Guidance if not mutual
        if (!isMutual && uid !== supabaseUser?.id) {
            dmGuidanceHTML = `<div class="dm-guidance-tag">
                <i class="fas fa-lock" style="font-size: 0.7rem; margin-right: 5px; opacity: 0.6;"></i>
                Enable DMs by following each other
            </div>`;
        }

        // Inject or clear badge near username
        const usernameEl = document.getElementById('viewProfileUsername');
        if (!usernameEl) return;

        // Remove existing badge/guidance if any
        const existingBadge = usernameEl.querySelector('.mutual-badge');
        if (existingBadge) existingBadge.remove();
        const existingTag = document.querySelector('.follows-you-tag');
        if (existingTag) existingTag.remove();
        const existingGuidance = document.querySelector('.dm-guidance-tag');
        if (existingGuidance) existingGuidance.remove();

        if (isFollowingMe && amIFollowing) {
            usernameEl.insertAdjacentHTML('beforeend', contextHTML);
        } else if (isFollowingMe) {
            const bioContainer = document.querySelector('.profile-bio-container');
            if (bioContainer) bioContainer.insertAdjacentHTML('afterend', contextHTML);
        }

        // Always show guidance if not mutual
        if (dmGuidanceHTML) {
            const statsBar = document.querySelector('.profile-stats-bar');
            if (statsBar) statsBar.insertAdjacentHTML('afterend', dmGuidanceHTML);
        }

    } catch (error) {
        console.error("Update Profile Stats Error:", error);
    }
}

async function openFollowList(type, userId, title) {
    if (!followListModal) return;

    followListTitle.textContent = title;
    followListItems.innerHTML = '<div class="loading-spinner" style="margin: 20px auto;"></div>';
    followListModal.classList.add('active');

    try {
        let data, error;

        if (type === 'followers') {
            const { data: d, error: e } = await supabase
                .from('follows')
                .select('follower:profiles!follower_id(*)')
                .eq('following_id', userId);
            data = d ? d.map(item => item.follower) : [];
            error = e;
        } else {
            const { data: d, error: e } = await supabase
                .from('follows')
                .select('following:profiles!following_id(*)')
                .eq('follower_id', userId);
            data = d ? d.map(item => item.following) : [];
            error = e;
        }

        if (error) throw error;

        followListItems.innerHTML = '';
        if (!data || data.length === 0) {
            followListItems.innerHTML = '<div style="text-align:center; padding: 20px; opacity: 0.5;">No users found.</div>';
            return;
        }

        data.forEach(profile => {
            if (!profile) return;
            const item = document.createElement('div');
            item.className = 'user-item';
            item.style.padding = '12px';
            item.style.marginBottom = '8px';
            item.style.background = 'rgba(255,255,255,0.03)';
            item.style.borderRadius = '12px';
            item.style.cursor = 'pointer';
            item.style.display = 'flex';
            item.style.alignItems = 'center';

            const isFollowingMe = currentUserFollowers.has(profile.id);
            const amIFollowing = currentUserFollowing.has(profile.id);
            const isMutual = isFollowingMe && amIFollowing;

            item.innerHTML = `
                <div class="user-avatar-small" style="width: 35px; height: 35px; margin-right: 12px; flex-shrink: 0;">
                    <img src="${profile.avatar_url || DEFAULT_AVATAR}" style="border-radius: 50%; width:100%; height:100%; object-fit:cover;">
                </div>
                <div style="flex: 1; overflow: hidden;">
                    <div style="font-family: 'Rajdhani', sans-serif; font-weight: 700; display: flex; align-items: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${profile.username}
                        ${isMutual ? '<span class="mutual-badge" style="font-size:0.55rem; padding: 1px 5px; flex-shrink: 0;">Mutual</span>' : ''}
                    </div>
                    ${(isFollowingMe && !amIFollowing) ? '<span class="follows-you-tag" style="font-size:0.6rem;">Follows you</span>' : ''}
                </div>
                <div class="user-actions">
                    <i class="fas fa-chevron-right" style="opacity: 0.3;"></i>
                </div>
            `;
            item.onclick = () => {
                followListModal.classList.remove('active');
                showUserProfile(profile.id);
            };
            followListItems.appendChild(item);
        });

    } catch (error) {
        console.error("Open Follow List Error:", error);
        followListItems.innerHTML = '<div style="text-align:center; color:#ff006e; padding: 20px;">Error loading list.</div>';
    }
}

function closeFollowList() {
    followListModal.classList.remove('active');
}







document.addEventListener('DOMContentLoaded', () => {
    // --- SOCIAL TABS LOGIC ---
    function setupSocialTabs() {
        const tabs = document.querySelectorAll('.social-tab-btn');
        const windows = {
            postsWindow: document.getElementById('postsWindow'),
            commentsWindow: document.getElementById('commentsWindow'),
            createPostWindow: document.getElementById('createPostWindow')
        };

        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetId = tab.getAttribute('data-target');
                const action = tab.getAttribute('data-action');

                // 1. Switch Active Window
                Object.values(windows).forEach(win => {
                    if (win) win.classList.remove('active');
                });
                if (windows[targetId]) {
                    windows[targetId].classList.add('active');
                    // Sync active tab state across all windows
                    document.querySelectorAll('.social-tab-btn').forEach(btn => {
                        if (btn.getAttribute('data-target') === targetId) {
                            btn.classList.add('active');
                        } else {
                            btn.classList.remove('active');
                        }
                    });
                }

                // 2. Special Action Handling
                if (action === 'openComments') {
                    if (typeof currentPostId === 'undefined' || !currentPostId) {
                        // Optional: Toast 'No post selected'
                    }
                }
            });
        });
    }
    setupSocialTabs();
});




