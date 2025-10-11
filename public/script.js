// Socket.IO Connection
const socket = io();

// DOM Elements
const welcomeScreen = document.getElementById('welcomeScreen');
const chatScreen = document.getElementById('chatScreen');
const usernameInput = document.getElementById('usernameInput');
const startChatBtn = document.getElementById('startChatBtn');
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

// Global Variables
let currentUser = null;
let userColor = '#ffffff';
let typingTimer = null;
// DM System Variables
let openDMWindows = new Map(); // userId -> window element
let dmMessages = new Map(); // userId -> messages array
let dmTypingUsers = new Map(); // userId -> typing status
let dmWindowZIndex = 1600;
function getCurrentDMUserId() {
    // returns the userId of the currently active DM window, or null
    const activeWindow = document.querySelector('.dm-window.active');
    return activeWindow ? activeWindow.dataset.userid : null;
}
// ================= CYBERPUNK THEME SYSTEM =================

let currentTheme = 'default';

function initializeTheme() {
    const savedTheme = localStorage.getItem('brochatz-theme') || 'default';
    const themeIcon = document.getElementById('themeIcon');
    const body = document.body;
    
    currentTheme = savedTheme;
    
    if (savedTheme === 'cyberpunk') {
        body.setAttribute('data-theme', 'cyberpunk');
        themeIcon.className = 'fas fa-moon theme-icon';
    } else {
        body.removeAttribute('data-theme');
        themeIcon.className = 'fas fa-sun theme-icon';
    }
}

function toggleTheme() {
    const themeIcon = document.getElementById('themeIcon');
    const body = document.body;
    
    if (currentTheme === 'default') {
        // Activate Cyberpunk Mode
        currentTheme = 'cyberpunk';
        body.setAttribute('data-theme', 'cyberpunk');
        themeIcon.className = 'fas fa-moon theme-icon';
        localStorage.setItem('brochatz-theme', 'cyberpunk');
        
        showThemeActivation('CYBERPUNK MODE ACTIVATED', 'cyberpunk');
        
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

// Initialize theme on load and add event listener
document.addEventListener('DOMContentLoaded', function() {
    initializeTheme();
    
    // Theme toggle event
    document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);
});

let isTyping = false;
let selectedMessage = null;
let replyingTo = null;
let isDeveloper = false;
let onlineUsers = new Map();
let phonkAudio = new Audio();
phonkAudio.loop = false;

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    createParticleField();
    initializeEventListeners();

    
    // Auto-resize textarea
    messageInput.addEventListener('input', function() {
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
    usernameInput.addEventListener('input', function() {
        const value = this.value.trim();
        startChatBtn.disabled = value.length < 2;
        
        if (value.length >= 2) {
            startChatBtn.classList.add('ready');
        } else {
            startChatBtn.classList.remove('ready');
        }
    });
    initializePostsSystem();
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

    eliteLoginBtn.addEventListener('click', function() {
        const username = developerUsername.value.trim();
        const password = developerPassword.value.trim();
        
        if (username.toLowerCase() === 'developer' && password === 'dynamobro8085') {
            isDeveloper = true;
            currentUser = 'DEVELOPER';
            startChat();

            // Play Phonk track once per session
            if (!sessionStorage.getItem('phonkPlayed')) {
                phonkAudio.src = 'phonk.mp3'; // <-- replace with actual path
                phonkAudio.play().catch(err => console.log('Audio play blocked:', err));
                
                phonkAudio.onended = () => {
                    phonkAudio.src = ''; // unload track
                };
                
                sessionStorage.setItem('phonkPlayed', 'true'); // mark as played
            }
        } else {
            alert('Invalid developer credentials!');
        }
    });

    eliteLoginBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    developerPassword.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !eliteLoginBtn.disabled) {
            eliteLoginBtn.click();
        }
    });

    // Developer Panel Events
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const developerPanel = document.getElementById('developerPanel');
    const panelCloseBtn = document.getElementById('panelCloseBtn');
    const warnModal = document.getElementById('warnModal');
    const warnCloseBtn = document.getElementById('warnCloseBtn');
    const sendWarnBtn = document.getElementById('sendWarnBtn');
    const cancelWarnBtn = document.getElementById('cancelWarnBtn');

    hamburgerBtn.addEventListener('click', function() {
        this.classList.toggle('active');
        developerPanel.classList.toggle('open');
        requestOnlineUsers();
    });

    panelCloseBtn.addEventListener('click', function() {
        hamburgerBtn.classList.remove('active');
        developerPanel.classList.remove('open');
    });

    // Warn Modal Events
    warnCloseBtn.addEventListener('click', closeWarnModal);
    cancelWarnBtn.addEventListener('click', closeWarnModal);

    sendWarnBtn.addEventListener('click', function() {
        const reason = document.getElementById('warnReason').value.trim();
        const userName = document.getElementById('warnUserName').textContent;
        
        if (reason) {
            socket.emit('warn-user', { username: userName, reason: reason });
            closeWarnModal();
        } else {
            alert('Please enter a warning reason!');
        }
    });

    usernameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !startChatBtn.disabled) {
            startChat();
        }
    });

    startChatBtn.addEventListener('click', startChat);

    // Chat Screen Events
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    messageInput.addEventListener('input', function() {
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


    // AI Modal Events
    aiCloseBtn.addEventListener('click', closeAIModal);

    // Click outside to close modals
    document.addEventListener('click', function(e) {
        if (!reactionPicker.contains(e.target) && !e.target.closest('.message-bubble')) {
            hideReactionPicker();
        }
        
        if (e.target === aiModal) {
            closeAIModal();
        }
    });

    // Long press for mobile
    let longPressTimer;
    chatMessages.addEventListener('touchstart', function(e) {
        const messageBubble = e.target.closest('.message-bubble');
        if (messageBubble) {
            longPressTimer = setTimeout(() => {
                showReactionPicker(e, messageBubble);
            }, 500);
        }
    });

    chatMessages.addEventListener('touchend', function() {
        clearTimeout(longPressTimer);
    });

    // Context menu for desktop
    chatMessages.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        const messageBubble = e.target.closest('.message-bubble');
        if (messageBubble) {
            showReactionPicker(e, messageBubble);
        }
    });

    // Reaction picker events
document.querySelectorAll('.reaction-emoji').forEach(emoji => {
    emoji.addEventListener('click', function() {
        if (!selectedMessage) return;

        const emojiValue = this.dataset.emoji;
        addReactionAnimation(this);

        // 👇 Check where the message lives
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

    document.getElementById('replyBtn').addEventListener('click', function() {
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
}

// Start Chat Function
function startChat() {
    let username;

    if (isDeveloper) {
        username = "DEVELOPER";  // force dev username
    } else {
        username = usernameInput.value.trim();
        if (username.length < 2) return;
    }

    currentUser = username;
    // Initialize DM system
    initializeDMSystem();
    initializePostsSystem();
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
    
    // Add button click animation
    startChatBtn.classList.add('clicked');
    
    setTimeout(() => {
        // Connect to socket
        socket.emit('user-joined', { username: username, isDeveloper: isDeveloper });

        // Show developer controls if developer
        if (isDeveloper) {
            document.getElementById('developerControls').style.display = 'block';
        }
        
        // Transition to chat screen
        setTimeout(() => {
            welcomeScreen.classList.remove('active');
            chatScreen.classList.add('active');
            hideLoadingScreen();
            messageInput.focus();
        }, 1000);
    }, 500);
}

// Send Message Function
function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

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
        replyTo: replyingTo
    };

    socket.emit('chat-message', messageData);

    // Add send animation
    sendBtn.classList.add('sending');
    setTimeout(() => {
        sendBtn.classList.remove('sending');
    }, 600);

    // Clear input and reply
    messageInput.value = '';
    messageInput.style.height = 'auto';
    clearReply();

    // Stop typing indicator
    if (isTyping) {
        isTyping = false;
        socket.emit('typing-stop');
    }
}

// Socket Event Listeners
socket.on('user-color-assigned', function(data) {
    userColor = data.color;
});

socket.on('admin-message', function(data) {
    addAdminMessage(data.message);
});

socket.on('chat-message', function(data) {
    addMessage(data);
    playMessageSound();
});

socket.on('user-notification', function(data) {
    showUserNotification(data);
});

socket.on('update-online-count', function(count) {
    updateOnlineCount(count);
});

socket.on('user-typing', function(data) {
    if (data.isTyping) {
        showTypingIndicator(data);
    } else {
        hideTypingIndicator(data.username);
    }
});

socket.on('message-reaction', function(data) {
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


socket.on('ai-response', function(data) {
    hideAITyping();
    addAIMessage(data.response, 'bot');
});

socket.on('ai-typing', function(isTyping) {
    if (isTyping) {
        showAITyping();
    } else {
        hideAITyping();
    }
});

socket.on('online-users-list', function(users) {
    displayOnlineUsers(users);
});

socket.on('user-kicked', function(data) {
    if (data.username === currentUser && !isDeveloper) {
        alert('You have been kicked out by the developer!');
        location.reload();
    }
});

// Message blocked notification
socket.on('message-blocked', function(data) {
    showNotification(data.message, 'error');
    
    // Visual warning effect
    const inputArea = document.querySelector('.message-input-area');
    inputArea.style.animation = 'shake 0.5s';
    setTimeout(() => {
        inputArea.style.animation = '';
    }, 500);
});

socket.on('user-warned', function(data) {
    if (data.username === currentUser) {
        alert(`âš ï¸ WARNING: You are being warned for: ${data.reason}`);
    }
});

socket.on('kick-notification', function(data) {
    addAdminMessage(`ðŸš« ${data.username} was kicked out by DEVELOPER`);
});

// DM Socket Events
socket.on('users-for-dm', function(users) {
    displayUsersForDM(users);
});

// DM message handler
socket.on('dm-message', function(data) {
    const messageData = {
        ...data,
        isOwn: false,
        status: 'delivered'
    };

    // ✅ Always store in memory, even if window is closed
    if (!dmMessages.has(data.senderId)) {
        dmMessages.set(data.senderId, []);
    }
    dmMessages.get(data.senderId).push(messageData);

    // ✅ If window is open → render immediately
    if (openDMWindows.has(data.senderId)) {
        addDMMessageToWindow(data.senderId, messageData);
    } else {
        // Otherwise just notify
        showDMNotificationPopup(data.senderName, data.message);
    }

    // ✅ Play sound for every new DM
    playMessageSound();
});


socket.on('dm-typing-start', function(data) {
    showDMTypingIndicator(data.senderId, data.username, data.color);
});

socket.on('dm-typing-stop', function(data) {
    hideDMTypingIndicator(data.senderId);
});

socket.on('dm-message-status', function(data) {
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

socket.on('dm-reaction', function(data) {
    // Add reaction to DM message
    const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (messageElement) {
        // Add reaction display logic here (similar to global chat)
        console.log('DM reaction received:', data);
    }
});

// Developer login sound (Phonk broadcast)
socket.on("playPhonk", function(data) {
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
    
    let replyHtml = '';
    if (data.replyTo) {
        replyHtml = `
            <div class="reply-preview" style="border-left-color: ${data.replyTo.color}">
                <strong>${data.replyTo.username}:</strong> ${data.replyTo.message.substring(0, 50)}${data.replyTo.message.length > 50 ? '...' : ''}
            </div>
        `;
    }

    messageDiv.innerHTML = `
        <div class="message-bubble" style="border-left: 3px solid ${data.color}">
            ${replyHtml}
            <div class="message-header">
                <span class="username" style="color: ${data.color}">
    ${data.username}
    ${data.isDeveloper ? '<i class="fas fa-check-circle developer-badge" title="Verified Developer"></i>' : ''}
</span>
                <span class="timestamp">${formatTime(data.timestamp)}</span>
            </div>
            <div class="message-content">${escapeHtml(data.message)}</div>
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
    
    const avatar = type === 'user' ? '🗿' : '💎ᴠɪᴘ';
    
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
    
    switch(data.type) {
        case 'join':
            icon = '🌟';
            message = `<strong style="color: ${data.color}">${data.username}</strong> ${data.message}`;
            break;
        case 'exit':
        case 'leave':
            icon = '⚡️';
            message = `<strong style="color: ${data.color}">${data.username}</strong> ${data.message}`;
            break;
        case 'comment':
            icon = '💬';
            message = `<strong style="color: ${data.color}">${data.username}</strong> commented on your post`;
            break;
        case 'reaction':
            icon = data.emoji || '👍';
            message = `<strong style="color: ${data.color}">${data.username}</strong> reacted to your ${data.target || 'message'}`;
            break;
        default:
            icon = '📢';
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
    onlineCount.textContent = count;
    
    // Add pulse animation
    onlineCount.style.animation = 'none';
    setTimeout(() => {
        onlineCount.style.animation = 'countPulse 0.5s ease-out';
    }, 10);
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

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function playMessageSound() {
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
chatMessages.addEventListener('scroll', function() {
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
document.addEventListener('mousemove', function(e) {
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
function requestOnlineUsers() {
    if (isDeveloper) {
        socket.emit('get-online-users');
    }
}

function displayOnlineUsers(users) {
    const usersList = document.getElementById('onlineUsersList');
    usersList.innerHTML = '';
    
    users.forEach(user => {
        if (user.username !== 'DEVELOPER') { // Don't show developer in the list
            const userDiv = document.createElement('div');
            userDiv.className = 'user-item';
            userDiv.innerHTML = `
                <div class="user-info">
                    <div class="user-name" style="color: ${user.color}">${user.username}</div>
                    <div class="user-ip">IP: ${user.ip}</div>
                </div>
                <div class="user-actions">
                    <button class="user-action-btn kick-btn" onclick="kickUser('${user.username}')">Kick</button>
                    <button class="user-action-btn warn-btn" onclick="openWarnModal('${user.username}')">Warn</button>
                </div>
            `;
            usersList.appendChild(userDiv);
        }
    });
}

function kickUser(username) {
    if (confirm(`Are you sure you want to kick ${username}?`)) {
        socket.emit('kick-user', { username: username });
    }
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
    document.getElementById('regularUserControls').style.display = 'block';

    userHamburgerBtn.addEventListener('click', function() {
        this.classList.toggle('active');
        userHamburgerMenu.classList.toggle('open');
        requestUsersList();
    });

    userHamburgerClose.addEventListener('click', function() {
        userHamburgerBtn.classList.remove('active');
        userHamburgerMenu.classList.remove('open');
    });

    // Click outside to close
    document.addEventListener('click', function(e) {
        if (!userHamburgerMenu.contains(e.target) && !userHamburgerBtn.contains(e.target)) {
            userHamburgerBtn.classList.remove('active');
            userHamburgerMenu.classList.remove('open');
        }
    });
}

function requestUsersList() {
    socket.emit('get-users-for-dm');
}

function displayUsersForDM(users) {
    const container = document.getElementById('usersListContainer');
    container.innerHTML = '';

    users.forEach(user => {
        if (user.username !== currentUser) {
            const userDiv = document.createElement('div');
            userDiv.className = 'user-list-item';
            userDiv.onclick = () => openDMWindow(user);

            const firstLetter = user.username.charAt(0).toUpperCase();
            
            userDiv.innerHTML = `
                <div class="user-list-avatar" style="background: ${user.color}">
                    ${firstLetter}
                </div>
                <div class="user-list-info">
                    <div class="user-list-name" style="color: ${user.color}">
                        ${user.username}
                        ${user.isDeveloper ? '<i class="fas fa-check-circle developer-badge" title="Verified Developer"></i>' : ''}
                    </div>
                    <div class="user-list-status">Click to message</div>
                </div>
            `;
            container.appendChild(userDiv);
        }
    });
}

function openDMWindow(user) {
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
            <div class="dm-reply-preview-container" id="dmReply-${user.id}"></div>
            <div class="dm-input-wrapper">
                <button class="dm-emoji-btn" onclick="toggleDMEmojis('${user.id}')">
                    <i class="fas fa-smile"></i>
                </button>
                <label class="gif-upload-btn" for="gifInput-${user.id}">
                    <i class="fas fa-images"></i>
                </label>
                <input type="file" class="gif-input" id="gifInput-${user.id}" accept=".gif,image/*" onchange="handleGIFUpload('${user.id}', this)">
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
    input.addEventListener('input', function() {
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
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendDMMessage(userId);
        }
    });

    // Make window draggable
    
}

function makeDMWindowDraggable(userId) {
    const dmWindow = openDMWindows.get(userId);
    const header = dmWindow.querySelector('.dm-header');
    
    let isDragging = false;
    let currentX, currentY, initialX, initialY;

    header.addEventListener('mousedown', function(e) {
        if (e.target.closest('button')) return;
        
        isDragging = true;
        dmWindow.style.zIndex = dmWindowZIndex++;
        
        initialX = e.clientX - dmWindow.offsetLeft;
        initialY = e.clientY - dmWindow.offsetTop;
    });

    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        
        dmWindow.style.left = Math.max(0, Math.min(currentX, window.innerWidth - dmWindow.offsetWidth)) + 'px';
        dmWindow.style.top = Math.max(0, Math.min(currentY, window.innerHeight - dmWindow.offsetHeight)) + 'px';
    });

    document.addEventListener('mouseup', function() {
        isDragging = false;
    });
}

function sendDMMessage(userId) {
    const input = document.getElementById(`dmInput-${userId}`);
    const message = input.value.trim();
    
    if (!message) return;

    const messageData = {
        targetUserId: userId,
        message: message,
        timestamp: new Date(),
        messageId: Date.now() + Math.random()
    };

    socket.emit('dm-message', messageData);

    // Add to local messages immediately
    addDMMessageToWindow(userId, {
        ...messageData,
        sender: currentUser,
        isOwn: true,
        status: 'sent'
    });

    input.value = '';
    input.style.height = 'auto';
}

function addDMMessageToWindow(userId, messageData) {
    const messagesContainer = document.getElementById(`dmMessages-${userId}`);
    if (!messagesContainer) return;

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

    let contentHtml = escapeHtml(messageData.message);
    
    // Handle GIF content
    if (messageData.isGIF) {
        contentHtml = `<div class="gif-container"><img src="${messageData.message}" class="gif-image" alt="GIF"></div>`;
    }

    messageDiv.innerHTML = `
        <div class="dm-message-bubble">
            ${messageData.isOwn ? `<button class="dm-delete-btn" onclick="deleteDMMessage('${userId}', '${messageData.messageId}')"><i class="fas fa-trash"></i></button>` : ''}
            <div class="dm-message-header">
                <div class="dm-message-time">${timeStr}</div>
                <div class="dm-message-status">${statusIcon}</div>
            </div>
            <div class="dm-message-content">${contentHtml}</div>
        </div>
    `;

    // Context menu for reactions and reply
    messageDiv.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        showDMReactionPicker(e, messageDiv, userId);
    });

    messagesContainer.appendChild(messageDiv);
    scrollDMToBottom(userId);

    // Store message
    if (!dmMessages.has(userId)) {
        dmMessages.set(userId, []);
    }
    dmMessages.get(userId).push(messageData);
}

function scrollDMToBottom(userId) {
    const messagesContainer = document.getElementById(`dmMessages-${userId}`);
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}


function loadDMMessages(userId) {
    const messages = dmMessages.get(userId) || [];
    messages.forEach(msg => addDMMessageToWindow(userId, msg));
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
    if (confirm('Delete this message?')) {
        socket.emit('delete-dm-message', { targetUserId: userId, messageId: messageId });
        
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
    }
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

function handleGIFUpload(userId, input) {
    const file = input.files[0];
    if (!file) return;

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file!');
        return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB!');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const messageData = {
            targetUserId: userId,
            message: e.target.result,
            timestamp: new Date(),
            messageId: Date.now() + Math.random(),
            isGIF: true
        };

        socket.emit('dm-message', messageData);

        // Add to local messages immediately
        addDMMessageToWindow(userId, {
            ...messageData,
            sender: currentUser,
            isOwn: true,
            status: 'sent'
        });
    };
    reader.readAsDataURL(file);
    
    // Clear input
    input.value = '';
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
document.addEventListener("click", function(e) {
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

// ================= POSTS SYSTEM ================= 

// Posts System Variables
let postsData = new Map(); // postId -> post object
let currentPostView = 'featured'; // 'featured' or 'my-posts'
let selectedPostForComment = null;
let currentEditingPost = null;

// Initialize Posts System
function initializePostsSystem() {
    // Update hamburger menu click handler
    const postsContainer = document.getElementById('postsContainer');
    const postsWindow = document.getElementById('postsWindow');
    const createPostWindow = document.getElementById('createPostWindow');
    const commentsWindow = document.getElementById('commentsWindow');
    const editPostModal = document.getElementById('editPostModal');
   // ================= POSTS EVENT DELEGATION =================
const postsFeed = document.getElementById("postsFeed");
if (postsFeed) {
    postsFeed.addEventListener("click", function(e) {
        const postElement = e.target.closest(".post-item");
        if (!postElement) return;
        const postId = postElement.dataset.postId;

        // ❤️ Reaction
        if (e.target.classList.contains("react-btn")) {
            socket.emit("post-reaction", { postId, emoji: "❤️" });
        }

        // 🗑️ Delete
        if (e.target.classList.contains("delete-btn")) {
            if (confirm("Delete this post?")) {
                socket.emit("delete-post", { postId });
            }
        }

        // ✏️ Edit
        if (e.target.classList.contains("edit-btn")) {
            const post = postsData.get(postId);
            if (!post) return;
            document.getElementById("editPostContent").value = post.content;
            document.getElementById("editPostModal").style.display = "flex";

            document.getElementById("editSaveBtn").onclick = () => {
                const newContent = document.getElementById("editPostContent").value.trim();
                if (newContent) {
                    socket.emit("edit-post", { postId, content: newContent });
                    document.getElementById("editPostModal").style.display = "none";
                }
            };
        }

        // 💬 Open comments
        if (e.target.classList.contains("comment-btn")) {
            selectedPostForComment = postId;
            document.getElementById("commentsWindow").style.display = "flex";
            socket.emit("get-post-comments", { postId });
        }
    });
}

// ================= COMMENT SEND BUTTON =================
const sendCommentBtn = document.getElementById("sendCommentBtn");
if (sendCommentBtn) {
    sendCommentBtn.addEventListener("click", () => {
        const content = document.getElementById("commentInput").value.trim();
        if (content && selectedPostForComment) {
            socket.emit("post-comment", {
                id: generatePostId(),
                postId: selectedPostForComment,
                content
            });
            document.getElementById("commentInput").value = "";
        }
    });
}


    // Posts container click
    postsContainer.addEventListener('click', function() {
        document.getElementById('userHamburgerMenu').classList.remove('open');
        document.getElementById('userHamburgerBtn').classList.remove('active');
        showPostsWindow();
    });

    // Posts window controls
    document.getElementById('postsBackBtn').addEventListener('click', function() {
        hidePostsWindow();
    });

    document.getElementById('postsRefreshBtn').addEventListener('click', function() {
        refreshPosts();
    });

    document.getElementById('postsHomeBtn').addEventListener('click', function() {
        hidePostsWindow();
    });

    document.getElementById('postsCreateBtn').addEventListener('click', function() {
        showCreatePostWindow();
    });

    // Navigation buttons
    document.getElementById('featuredPostsBtn').addEventListener('click', function() {
        switchPostView('featured');
    });

    document.getElementById('myPostsBtn').addEventListener('click', function() {
        switchPostView('my-posts');
    });

    // Create post controls
    document.getElementById('createBackBtn').addEventListener('click', function() {
        hideCreatePostWindow();
    });

    document.getElementById('cancelPostBtn').addEventListener('click', function() {
        hideCreatePostWindow();
    });

    document.getElementById('publishPostBtn').addEventListener('click', function() {
        publishPost();
    });

    // Comments controls
    document.getElementById('commentsBackBtn').addEventListener('click', function() {
        hideCommentsWindow();
    });

    document.getElementById('sendCommentBtn').addEventListener('click', function() {
        sendComment();
    });

    // Edit post controls
    document.getElementById('editCloseBtn').addEventListener('click', function() {
        hideEditPostModal();
    });

    document.getElementById('editCancelBtn').addEventListener('click', function() {
        hideEditPostModal();
    });

    document.getElementById('editSaveBtn').addEventListener('click', function() {
        saveEditedPost();
    });

   // Event delegation for post actions
document.getElementById("postsFeed").addEventListener("click", function(e) {
    const postElement = e.target.closest(".post-item");
    if (!postElement) return;
    const postId = postElement.dataset.postId;

    // ❤️ Reaction
    if (e.target.classList.contains("react-btn")) {
        socket.emit("post-reaction", { postId, emoji: "❤️" });
    }

    // 🗑️ Delete
    if (e.target.classList.contains("delete-btn")) {
        if (confirm("Delete this post?")) {
            socket.emit("delete-post", { postId });
        }
    }

    // ✏️ Edit
    if (e.target.classList.contains("edit-btn")) {
        const post = postsData.get(postId);
        if (!post) return;
        document.getElementById("editPostContent").value = post.content;
        document.getElementById("editPostModal").style.display = "flex";

        document.getElementById("editSaveBtn").onclick = () => {
            const newContent = document.getElementById("editPostContent").value.trim();
            if (newContent) {
                socket.emit("edit-post", { postId, content: newContent });
                document.getElementById("editPostModal").style.display = "none";
            }
        };
    }

    // 💬 Open comments
    if (e.target.classList.contains("comment-btn")) {
        selectedPostForComment = postId;
        document.getElementById("commentsWindow").style.display = "flex";
        socket.emit("get-post-comments", { postId });
    }
});


    // Image upload
    document.getElementById('postImageInput').addEventListener('change', handleImageUpload);

    // Comment input enter key
    document.getElementById('commentInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendComment();
        }
    });

    // Auto-resize comment input
    document.getElementById('commentInput').addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });

    // Close dropdowns on outside click
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.post-menu-btn')) {
            closeAllDropdowns();
        }
    });
}

// Show/Hide Windows
function showPostsWindow() {
    document.getElementById('postsWindow').style.display = 'flex';
    loadPosts();
}

function hidePostsWindow() {
    document.getElementById('postsWindow').style.display = 'none';
}

function showCreatePostWindow() {
    document.getElementById('createPostWindow').style.display = 'flex';
    document.getElementById('postContent').focus();
}

function hideCreatePostWindow() {
    document.getElementById('createPostWindow').style.display = 'none';
    clearCreatePostForm();
}

function showCommentsWindow(postId) {
    selectedPostForComment = postId;
    document.getElementById('commentsWindow').style.display = 'flex';
    loadOriginalPost(postId);
    loadComments(postId);
}

function hideCommentsWindow() {
    document.getElementById('commentsWindow').style.display = 'none';
    selectedPostForComment = null;
}

function showEditPostModal(postId) {
    const post = postsData.get(postId);
    if (!post) return;

    currentEditingPost = postId;
    document.getElementById('editPostContent').value = post.content;
    document.getElementById('editPostModal').style.display = 'flex';
    document.getElementById('editPostContent').focus();
}

function hideEditPostModal() {
    document.getElementById('editPostModal').style.display = 'none';
    currentEditingPost = null;
    document.getElementById('editPostContent').value = '';
}

// Post Navigation
function switchPostView(view) {
    currentPostView = view;
    
    // Update active button
    document.querySelectorAll('.posts-nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (view === 'featured') {
        document.getElementById('featuredPostsBtn').classList.add('active');
    } else {
        document.getElementById('myPostsBtn').classList.add('active');
    }
    
    loadPosts();
}

// Load Posts
function loadPosts() {
    const feed = document.getElementById('postsFeed');
    
    // Show loading
    feed.innerHTML = `
        <div class="loading-posts">
            <div class="loading-spinner-posts"></div>
            Loading posts...
        </div>
    `;

    setTimeout(() => {
        const filteredPosts = getFilteredPosts();
        renderPosts(filteredPosts);
    }, 500);
}

function getFilteredPosts() {
    const posts = Array.from(postsData.values());
    
    if (currentPostView === 'my-posts') {
        return posts.filter(post => post.author === currentUser)
                   .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else {
        return posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
}

function renderPosts(posts) {
    const feed = document.getElementById('postsFeed');
    
    if (posts.length === 0) {
        feed.innerHTML = `
            <div class="empty-posts">
                <i class="fas fa-newspaper"></i>
                <h3>No posts yet</h3>
                <p>${currentPostView === 'my-posts' ? 'You haven\'t created any posts yet.' : 'Be the first to create a post!'}</p>
            </div>
        `;
        return;
    }

    feed.innerHTML = posts.map(post => createPostHTML(post)).join('');
    
    // Add event listeners to new posts
    addPostEventListeners();
}

function createPostHTML(post) {
    const isOwnPost = post.author === currentUser;
    const timeStr = formatTime(post.timestamp);
    const avatarLetter = post.author.charAt(0).toUpperCase();
    
    return `
        <div class="post-item" data-post-id="${post.id}">
            <div class="post-header">
                <div class="post-user-info">
                    <div class="post-avatar" style="background: ${post.authorColor}">
                        ${avatarLetter}
                    </div>
                    <div>
                        <div class="post-user-name" style="color: ${post.authorColor}">
                            ${post.author}
                            ${post.isDeveloper ? '<i class="fas fa-check-circle developer-badge" title="Verified Developer"></i>' : ''}
                        </div>
                        <div class="post-timestamp">${timeStr}</div>
                    </div>
                </div>
                ${isOwnPost ? `
                <div class="post-menu" style="position: relative;">
                    <button class="post-menu-btn" onclick="togglePostDropdown('${post.id}')">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div class="post-dropdown" id="dropdown-${post.id}">
                        <div class="dropdown-item" onclick="editPost('${post.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </div>
                        <div class="dropdown-item delete" onclick="deletePost('${post.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>
            
            <div class="post-content">
                <div class="post-text">${escapeHtml(post.content)}</div>
                ${post.image ? `<img src="${post.image}" class="post-image" alt="Post image">` : ''}
            </div>
            
            <div class="post-actions">
                <div class="post-action-group">
                    <button class="post-action-btn" onclick="togglePostReaction('${post.id}', '❤️')">
                        <i class="fas fa-heart"></i>
                        <span>${post.reactions?.['❤️'] || 0}</span>
                    </button>
                    <button class="post-action-btn" onclick="showCommentsWindow('${post.id}')">
                        <i class="fas fa-comment"></i>
                        <span>${post.comments?.length || 0}</span>
                    </button>
                </div>
                <div class="post-impressions">
                    ${post.impressions || 0} impressions
                </div>
            </div>
        </div>
    `;
}

// Post Actions
function togglePostDropdown(postId) {
    const dropdown = document.getElementById(`dropdown-${postId}`);
    const isVisible = dropdown.style.display === 'block';
    
    // Close all dropdowns
    closeAllDropdowns();
    
    // Toggle current dropdown
    if (!isVisible) {
        dropdown.style.display = 'block';
    }
}

function closeAllDropdowns() {
    document.querySelectorAll('.post-dropdown').forEach(dropdown => {
        dropdown.style.display = 'none';
    });
}

function editPost(postId) {
    closeAllDropdowns();
    showEditPostModal(postId);
}

function deletePost(postId) {
    closeAllDropdowns();
    
    if (confirm('Are you sure you want to delete this post?')) {
        // Emit delete event to server
        socket.emit('delete-post', { postId: postId });
        
        // Remove from local storage
        postsData.delete(postId);
        
        // Refresh posts view
        loadPosts();
        
        showNotification('Post deleted successfully', 'success');
    }
}

function togglePostReaction(postId, emoji) {
    const post = postsData.get(postId);
    if (!post) return;
    
    // Initialize reactions if not exists
    if (!post.reactions) {
        post.reactions = {};
    }
    
    // Toggle reaction
    if (post.userReactions && post.userReactions.includes(emoji)) {
        // Remove reaction
        post.reactions[emoji] = Math.max(0, (post.reactions[emoji] || 0) - 1);
        post.userReactions = post.userReactions.filter(r => r !== emoji);
    } else {
        // Add reaction
        post.reactions[emoji] = (post.reactions[emoji] || 0) + 1;
        if (!post.userReactions) post.userReactions = [];
        post.userReactions.push(emoji);
    }
    
    // Emit to server
    socket.emit('post-reaction', {
        postId: postId,
        emoji: emoji,
        username: currentUser
    });
    
    // Update UI
    loadPosts();
}

// Create Post
function publishPost() {
    const content = document.getElementById('postContent').value.trim();
    const imagePreview = document.getElementById('imagePreview');
    const image = imagePreview.querySelector('img')?.src || null;
    
    if (!content) {
        showNotification('Please write something to post', 'error');
        return;
    }
    
    if (content.length > 500) {
        showNotification('Post content is too long (max 500 characters)', 'error');
        return;
    }
    
    const postData = {
        id: Date.now() + Math.random(),
        content: content,
        image: image,
        author: currentUser,
        authorColor: userColor,
        isDeveloper: isDeveloper,
        timestamp: new Date(),
        reactions: {},
        comments: [],
        impressions: 0
    };
    
    // Add to local storage
    postsData.set(postData.id, postData);
    
    // Emit to server
    socket.emit('create-post', postData);
    
    // Close create window
    hideCreatePostWindow();
    
    // Refresh posts if on featured view
    if (currentPostView === 'featured') {
        loadPosts();
    }
    
    showNotification('Post published successfully!', 'success');
}

function clearCreatePostForm() {
    document.getElementById('postContent').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('imagePreview').innerHTML = '';
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('Image size must be less than 5MB', 'error');
        return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
        showNotification('Please select an image file', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = `
            <img src="${e.target.result}" alt="Preview">
            <button onclick="removeImagePreview()" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7); border: none; color: white; border-radius: 50%; width: 25px; height: 25px; cursor: pointer;">×</button>
        `;
        preview.style.display = 'block';
        preview.style.position = 'relative';
    };
    reader.readAsDataURL(file);
}

function removeImagePreview() {
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('postImageInput').value = '';
}

// Edit Post
function saveEditedPost() {
    if (!currentEditingPost) return;
    
    const newContent = document.getElementById('editPostContent').value.trim();
    
    if (!newContent) {
        showNotification('Post content cannot be empty', 'error');
        return;
    }
    
    if (newContent.length > 500) {
        showNotification('Post content is too long (max 500 characters)', 'error');
        return;
    }
    
    const post = postsData.get(currentEditingPost);
    if (post) {
        post.content = newContent;
        post.edited = true;
        post.editedAt = new Date();
        
        // Emit to server
        socket.emit('edit-post', {
            postId: currentEditingPost,
            content: newContent
        });
        
        hideEditPostModal();
        loadPosts();
        showNotification('Post updated successfully!', 'success');
    }
}

// Comments System
function loadOriginalPost(postId) {
    const post = postsData.get(postId);
    if (!post) return;
    
    const originalPost = document.getElementById('originalPost');
    originalPost.innerHTML = createPostHTML(post);
}

function loadComments(postId) {
    const post = postsData.get(postId);
    if (!post) return;
    
    const commentsSection = document.getElementById('commentsSection');
    const comments = post.comments || [];
    
    if (comments.length === 0) {
        commentsSection.innerHTML = `
            <div class="empty-posts">
                <i class="fas fa-comments"></i>
                <h3>No comments yet</h3>
                <p>Be the first to comment on this post!</p>
            </div>
        `;
        return;
    }
    
    commentsSection.innerHTML = comments.map(comment => createCommentHTML(comment)).join('');
}

function createCommentHTML(comment) {
    const timeStr = formatTime(comment.timestamp);
    const avatarLetter = comment.author.charAt(0).toUpperCase();
    
    return `
        <div class="comment-item" data-comment-id="${comment.id}">
            <div class="comment-header">
                <div class="comment-avatar" style="background: ${comment.authorColor}">
                    ${avatarLetter}
                </div>
                <div class="comment-username" style="color: ${comment.authorColor}">
                    ${comment.author}
                    ${comment.isDeveloper ? '<i class="fas fa-check-circle developer-badge" title="Verified Developer"></i>' : ''}
                </div>
                <div class="comment-time">${timeStr}</div>
            </div>
            <div class="comment-content">${escapeHtml(comment.content)}</div>
            <div class="comment-actions">
                <button class="comment-reply-btn" onclick="replyToComment('${comment.id}')">
                    <i class="fas fa-reply"></i> Reply
                </button>
            </div>
        </div>
    `;
}

function sendComment() {
    if (!selectedPostForComment) return;
    
    const commentInput = document.getElementById('commentInput');
    const content = commentInput.value.trim();
    
    if (!content) {
        showNotification('Please write a comment', 'error');
        return;
    }
    
    if (content.length > 300) {
        showNotification('Comment is too long (max 300 characters)', 'error');
        return;
    }
    
    const commentData = {
        id: Date.now() + Math.random(),
        postId: selectedPostForComment,
        content: content,
        author: currentUser,
        authorColor: userColor,
        isDeveloper: isDeveloper,
        timestamp: new Date()
    };
    
    // Add to post
    const post = postsData.get(selectedPostForComment);
    if (post) {
        if (!post.comments) post.comments = [];
        post.comments.push(commentData);
        
        // Emit to server
        socket.emit('post-comment', commentData);
        
        // Clear input
        commentInput.value = '';
        commentInput.style.height = 'auto';
        
        // Reload comments
        loadComments(selectedPostForComment);
        
        showNotification('Comment added!', 'success');
    }
}

function replyToComment(commentId) {
    // This can be expanded for threaded comments
    console.log('Reply to comment:', commentId);
    showNotification('Reply feature coming soon!', 'info');
}

// Refresh Posts
function refreshPosts() {
    const refreshBtn = document.getElementById('postsRefreshBtn');
    refreshBtn.style.animation = 'spin 1s linear';
    
    setTimeout(() => {
        refreshBtn.style.animation = '';
        loadPosts();
        showNotification('Posts refreshed!', 'success');
    }, 1000);
}

// Utility Functions
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            ${message}
        </div>
    `;
    
    document.getElementById('notificationContainer').appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('notification-burst');
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 3000);
}

// Socket Events for Posts
socket.on('post-created', function(postData) {
    postsData.set(postData.id, postData);
    
    if (currentPostView === 'featured' && document.getElementById('postsWindow').style.display === 'flex') {
        loadPosts();
    }
    
    // Show notification if not own post
    if (postData.author !== currentUser) {
        showNotification(`${postData.author} created a new post`, 'info');
    }
});

socket.on('post-updated', function(data) {
    const post = postsData.get(data.postId);
    if (post) {
        post.content = data.content;
        post.edited = true;
        post.editedAt = data.editedAt;
        
        if (document.getElementById('postsWindow').style.display === 'flex') {
            loadPosts();
        }
    }
});

socket.on('post-deleted', function(data) {
    postsData.delete(data.postId);
    
    if (document.getElementById('postsWindow').style.display === 'flex') {
        loadPosts();
    }
    
    showNotification(`Post deleted`, 'info');
});

socket.on('post-comment', function(commentData) {
    const post = postsData.get(commentData.postId);
    if (post) {
        if (!post.comments) post.comments = [];
        post.comments.push(commentData);
        
        // If viewing comments for this post, reload
        if (selectedPostForComment === commentData.postId) {
            loadComments(commentData.postId);
        }
        
        // Show notification if someone commented on your post
        if (post.author === currentUser && commentData.author !== currentUser) {
            showNotification(`${commentData.author} commented on your post`, 'info');
        }
    }
});

socket.on('post-reaction', function(data) {
    const post = postsData.get(data.postId);
    if (post) {
        if (!post.reactions) post.reactions = {};
        post.reactions[data.emoji] = data.count;
        
        if (document.getElementById('postsWindow').style.display === 'flex') {
            loadPosts();
        }
    }
});

// ===== Extra Socket Events for Posts =====

// Comment notification
socket.on('comment-notification', function(data) {
    showUserNotification({
        type: 'comment',
        username: data.commenterName,
        color: '#3a86ff',
        message: 'commented on your post'
    });
});

// Post impression update
socket.on('post-impression-update', function(data) {
    const postElement = document.querySelector(`[data-post-id="${data.postId}"]`);
    if (postElement) {
        const impressionsEl = postElement.querySelector('.post-impressions');
        if (impressionsEl) {
            impressionsEl.textContent = `${data.impressions} impressions`;
        }
    }
});


// ================= POSTS EXTRA SOCKET EVENTS =================
socket.on('comment-notification', function(data) {
    showUserNotification({
        type: 'comment',
        username: data.commenterName,
        color: '#3a86ff',
        message: 'commented on your post'
    });
});

socket.on('post-impression-update', function(data) {
    const postElement = document.querySelector(`[data-post-id="${data.postId}"]`);
    if (postElement) {
        const impressionsEl = postElement.querySelector('.post-impressions');
        if (impressionsEl) {
            impressionsEl.textContent = `${data.impressions} impressions`;
        }
    }
});

// ================= UTILITY FUNCTIONS FOR POSTS =================
function generatePostId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function formatPostTime(timestamp) {
    const now = new Date();
    const postTime = new Date(timestamp);
    const diffMs = now - postTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return postTime.toLocaleDateString();
}

// Event Listeners Helper
function addPostEventListeners() {
    // Click on post to increment impressions
    document.querySelectorAll('.post-item').forEach(postEl => {
        postEl.addEventListener('click', function(e) {
            // Don't count clicks on buttons
            if (e.target.closest('button') || e.target.closest('.post-actions')) return;
            
            const postId = this.dataset.postId;
            const post = postsData.get(postId);
            if (post) {
                post.impressions = (post.impressions || 0) + 1;
                socket.emit('post-impression', { postId: postId });
            }
        });
    });
}
// ================= TIC-TAC-TOE GAME SYSTEM =================

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
        ticTacToeGame.addEventListener('click', function() {
            showTTTOpponentWindow();
        });
    }

    // Opponent window controls
    const tttOpponentBackBtn = document.getElementById('tttOpponentBackBtn');
    if (tttOpponentBackBtn) {
        tttOpponentBackBtn.addEventListener('click', function() {
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
        leftOkBtn.addEventListener('click', function() {
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
            challengeBtn.addEventListener('click', function() {
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
    
    console.log('🔄 Updating turn indicator. isMyTurn:', currentGameState.isMyTurn);
    
    if (currentGameState.isMyTurn) {
        indicator.textContent = 'Your Turn!';
        indicator.style.color = '#00ff41';
        indicator.style.textShadow = '0 0 20px #00ff41';
        enableBoard();
        console.log('✅ Enabled board - YOUR TURN');
    } else {
        indicator.textContent = `${currentGameState.opponent.name}'s Turn...`;
        indicator.style.color = '#ff00ff';
        indicator.style.textShadow = '0 0 20px #ff00ff';
        disableBoard();
        console.log('✅ Disabled board - OPPONENT TURN');
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
// Make move
function makeMove(index) {
    console.log('🎯 Making move at index:', index);
    
    // Update local board
    currentGameState.board[index] = currentGameState.mySymbol;
    
    // Update UI immediately
    const cell = document.querySelector(`.ttt-cell[data-index="${index}"]`);
    cell.textContent = currentGameState.mySymbol;
    cell.classList.add(`ttt-cell-${currentGameState.mySymbol.toLowerCase()}`);
    cell.classList.add('ttt-cell-disabled');
    console.log('✅ Updated my cell', index, 'with', currentGameState.mySymbol);

    // Send move to server
    socket.emit('ttt-move-made', {
        gameId: currentGameState.gameId,
        index: index,
        symbol: currentGameState.mySymbol,
        board: currentGameState.board
    });
    console.log('📤 Sent move to server');

    // Switch turn to opponent - NOW it's their turn
    currentGameState.isMyTurn = false;
    console.log('✅ Set isMyTurn to FALSE');
    
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
// Receive opponent's move
function receiveOpponentMove(data) {
    console.log('📥 Received opponent move:', data);
    
    if (data.gameId !== currentGameState.gameId) {
        console.log('❌ Game ID mismatch');
        return;
    }

    // Update board from server
    currentGameState.board = data.board;
    
    // Update UI for the move
    const cell = document.querySelector(`.ttt-cell[data-index="${data.index}"]`);
    if (cell && !cell.classList.contains('ttt-cell-disabled')) {
        cell.textContent = data.symbol;
        cell.classList.add(`ttt-cell-${data.symbol.toLowerCase()}`);
        cell.classList.add('ttt-cell-disabled');
        console.log('✅ Updated cell', data.index, 'with', data.symbol);
    }

    // NOW it's MY turn
    currentGameState.isMyTurn = true;
    console.log('✅ Set isMyTurn to TRUE');
    
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
    star.textContent = '⭐';
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
    if (confirm('Are you sure you want to leave the game?')) {
        socket.emit('ttt-player-left', {
            gameId: currentGameState.gameId,
            playerName: currentUser
        });
        
        returnToChat();
    }
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
    console.log('🎮 Game started!');
console.log('My symbol:', currentGameState.mySymbol);
console.log('Opponent symbol:', currentGameState.opponentSymbol);
console.log('Is my turn:', currentGameState.isMyTurn);
console.log('Opponent:', currentGameState.opponent.name);
    // Notify server
    socket.emit('ttt-game-ended');
}

// ===== SOCKET EVENTS FOR TIC-TAC-TOE =====

// Socket event: Receive opponents list
socket.on('ttt-opponents-list', function(users) {
    displayTTTOpponents(users);
});

// Socket event: Receive challenge
socket.on('ttt-challenge-received', function(data) {
    showChallengePopup(data);
});

// Socket event: Challenge declined
socket.on('ttt-challenge-declined', function(data) {
    showNotification(`${data.declinerName} declined your challenge`, 'info');
});

// Socket event: Challenge timeout
socket.on('ttt-challenge-timeout', function() {
    showNotification('Challenge expired', 'info');
});

// Socket event: Game started
socket.on('ttt-game-started', function(data) {
    startTTTGame(data);
});

// Socket event: Opponent move
socket.on('ttt-opponent-move', function(data) {
    receiveOpponentMove(data);
});

// Socket event: Replay request received
socket.on('ttt-replay-request-received', function(data) {
    showReplayPopup(data);
});

// Socket event: Replay declined
socket.on('ttt-replay-declined', function(data) {
    showNotification(`${data.declinerName} declined the replay`, 'info');
    document.getElementById('tttReplayBtn').disabled = false;
    document.getElementById('tttReplayBtn').innerHTML = '<i class="fas fa-redo"></i> Play Again';
});

// Socket event: Replay accepted
socket.on('ttt-replay-accepted', function(data) {
    startReplayGame(data);
});

// Socket event: Opponent left
socket.on('ttt-opponent-left', function(data) {
    currentGameState.gameActive = false;
    showTTTLeftPopup(data);
});

// Socket event: Update user game status
socket.on('user-game-status-updated', function(data) {
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
document.addEventListener('DOMContentLoaded', function() {
    initializeTicTacToe();
});

// Clean up on page unload
window.addEventListener('beforeunload', function() {
    if (currentGameState.gameActive) {
        socket.emit('ttt-player-left', {
            gameId: currentGameState.gameId,
            playerName: currentUser
        });
    }
});

console.log('✅ Tic-Tac-Toe system initialized!');