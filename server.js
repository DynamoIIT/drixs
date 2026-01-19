const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { systemPrompt } = require('./ai-system-prompt');


// Load environment variables with error handling
try {
    const envPath = path.join(__dirname, '.env');
    const result = require('dotenv').config({ path: envPath });
    if (result.error) {
        console.log('⚠️ Dotenv Error:', result.error.message);
    } else {
        console.log('✅ Environment variables loaded from:', envPath);
    }
} catch (error) {
    console.log('⚠️ No .env file found or dotenv missing');
}

const app = express();
const server = createServer(app);

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// DM System Storage
const dmMessages = new Map(); // userId-userId -> messages array
const dmTypingUsers = new Map(); // userId -> Set of users they're typing to

// Cache Control Middleware - MUST come before express.static
app.use((req, res, next) => {
    // Disable caching for HTML, JS, CSS files during development
    if (req.url.endsWith('.html') || req.url.endsWith('.js') || req.url.endsWith('.css') || req.url === '/') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    next();
});

// Enhanced Socket.IO configuration for Render deployment
const io = new Server(server, {
    cors: {
        origin: "*",   // allow all for now
        methods: ["GET", "POST"],
        credentials: true
    },

    allowEIO3: true,
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 10e6, // 10MB limit for images/GIFs
    serveClient: false
});

// Minimal middleware to avoid body-parser issues
app.use(express.static(path.join(__dirname, 'public')));

// Security Headers for Google Auth
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless'); // more compatible than require-corp
    next();
});

// Config Endpoint to hide keys from source code (but still public for client)
app.get('/config', (req, res) => {
    console.log("DEBUG: Config Request Received. SUPABASE_URL:", process.env.SUPABASE_URL ? "Exists" : "MISSING");
    res.json({
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_ANON_KEY
    });
});

// Manual JSON parsing to avoid body-parser
app.use((req, res, next) => {
    if (req.method === 'POST' && req.headers['content-type'] === 'application/json') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                req.body = JSON.parse(body);
            } catch (e) {
                req.body = {};
            }
            next();
        });
    } else {
        next();
    }
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        status: 'OK',
        message: 'BRO_CHATZ is running!',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    }));
});

// ===================================
// AI CHAT API ENDPOINTS
// ===================================

// API: Send message to Drixy AI
app.post('/api/chat', async (req, res) => {
    try {
        const { message, userId, sessionId } = req.body;

        if (!message || !userId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!supabase) {
            return res.status(500).json({ error: 'Database connection not configured' });
        }

        // 0. Save User Message (CRITICAL FIX: Was missing!)
        const { error: saveError1 } = await supabase
            .from('ai_chat_history')
            .insert({
                user_id: userId,
                role: 'user',
                content: message
            });

        if (saveError1) console.error('Error saving User message:', saveError1);

        // 1. Get Conversation History (Context)
        const { data: history, error: historyError } = await supabase
            .from('ai_chat_history')
            .select('role, content')
            .eq('user_id', userId)
            // Optional: filter by session if provided
            // .eq('session_id', sessionId) 
            .order('created_at', { ascending: false })
            .limit(50); // Increased Context window size as requested

        if (historyError) {
            console.error('History fetch error:', historyError);
            // Continue without history if error? Or fail? Let's continue.
        }

        // Reverse history to be chronological: [Oldest ... Newest]
        const conversationHistory = (history || []).reverse();

        // 2. Build Messages Array for HuggingFace
        const messages = [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            // Add current user message
            { role: 'user', content: message }
        ];

        // 3. Call HuggingFace Router (OpenAI Compatible API)
        const HF_API_URL = 'https://router.huggingface.co/v1/chat/completions';
        const modelId = process.env.HUGGINGFACE_MODEL || 'meta-llama/Meta-Llama-3-8B-Instruct';

        const hfResponse = await fetch(
            HF_API_URL,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: messages, // Send standard messages array directly
                    max_tokens: 500,
                    temperature: 0.7,
                    stream: false
                })
            }
        );

        if (!hfResponse.ok) {
            const errorText = await hfResponse.text();
            console.error('HuggingFace Router Error:', hfResponse.status, errorText);
            throw new Error(`AI Provider Error: ${hfResponse.status} - ${errorText}`);
        }

        const data = await hfResponse.json();

        // Standard OpenAI Response Format: choices[0].message.content
        const botMessage = data.choices?.[0]?.message?.content || "I'm lost for words.";

        // 4. Save AI Response
        const { error: saveError2 } = await supabase
            .from('ai_chat_history')
            .insert({
                user_id: userId,
                role: 'assistant',
                content: botMessage
            });

        if (saveError2) console.error('Error saving AI response:', saveError2);

        // 5. Send Response
        res.json({
            success: true,
            response: botMessage,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('AI Chat Logic Error:', error);
        res.status(500).json({
            error: 'Failed to process AI chat',
            details: error.message
        });
    }
});

// API: Get Chat History
app.get('/api/chat/history/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        if (!supabase) {
            console.error('Database connection not configured for /api/chat/history/:userId');
            return res.status(500).json({ error: 'Database connection not configured' });
        }

        const { data, error } = await supabase
            .from('ai_chat_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true }); // Oldest first for display

        if (error) {
            console.error('Supabase fetch history error for user', userId, ':', error.message, error.details);
            throw error;
        }

        res.json({ success: true, messages: data });
    } catch (error) {
        console.error('SERVER CHAT HISTORY ERROR:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to fetch chat history' });
    }
});

// Root route with error handling
app.get('/', (req, res) => {
    try {
        const indexPath = path.join(__dirname, 'public', 'index.html');
        res.sendFile(indexPath, (err) => {
            if (err) {
                console.error('Error sending index.html:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Server Error: Unable to load the application');
            }
        });
    } catch (error) {
        console.error('Route error:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error');
    }
});

// Store connected users
const onlineUsers = new Map();
// ===== TIC-TAC-TOE GAME STORAGE =====
const activeGames = new Map(); // gameId -> game object
const userGameStatus = new Map(); // userId -> gameId

// ================= POSTS SYSTEM STORAGE =================
const postsStorage = new Map(); // postId -> post object
const postComments = new Map(); // postId -> comments array
const postReactions = new Map(); // postId -> reactions object

const restrictedUsernames = ['developer', 'DEVELOPER', 'Developer', 'DEVEL0PER', 'devel0per', 'BSE SENSEX', 'bse sensex', 'BSE', 'bse'];
const userColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
];

// ================= WORD FILTER SYSTEM =================
const BLOCKED_WORDS = ['nigga', 'fuck', 'bitch', 'madarchod', 'madharchod', 'randi', 'rand', 'bsdk', 'bhosdiwale', 'bhosdi', 'bhenchod', 'benchod', 'chod', 'chud', 'sperm', 'land', 'launda', 'lund', 'boob', 'pussy', 'chuchi', 'sex', 'sexy', 'chutiye', 'chut', 'chutiya', '$ex', 'nipple', 'jhaant', 'jant', 'rande']; // Add or remove words separated by commas
const userWarnings = new Map(); // Track user warnings (socketId -> count)

function containsBlockedWord(message) {
    const lowerMessage = message.toLowerCase();
    return BLOCKED_WORDS.some(word => {
        // Check if word exists as whole word or part of text
        const regex = new RegExp(`\\b${word}\\b|${word}`, 'i');
        return regex.test(lowerMessage);
    });
}

function handleMessageViolation(socket, user) {
    const currentWarnings = (userWarnings.get(socket.id) || 0) + 1;
    userWarnings.set(socket.id, currentWarnings);

    // Send warning to user
    socket.emit('message-blocked', {
        message: `⚠️ Your message was blocked for containing inappropriate content. Warning ${currentWarnings}/3`,
        warningCount: currentWarnings
    });

    // Kick after 3 violations
    if (currentWarnings >= 3) {
        socket.emit('user-kicked', {
            username: user.username,
            reason: 'Multiple violations of chat guidelines'
        });

        io.emit('admin-message', {
            message: `🚫 ${user.username} was removed for violating chat guidelines`,
            timestamp: new Date(),
            type: 'kick'
        });

        // Disconnect user
        setTimeout(() => {
            socket.disconnect(true);
            onlineUsers.delete(socket.id);
            userWarnings.delete(socket.id);
            io.emit('update-online-count', onlineUsers.size);
        }, 1000);

        console.log(`🚫 ${user.username} kicked for word filter violations`);
    } else {
        console.log(`⚠️ ${user.username} warned (${currentWarnings}/3)`);
    }
}

let currentPhonk = "phonk.mp3"; // default track
// Enhanced Gemini AI Integration with better error handling
let genAI, model;

async function initializeGeminiAI() {
    try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
            genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());
            model = genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            });
            console.log('✅ Gemini AI initialized successfully');
            return true;
        } else {
            console.log('⚠️ GEMINI_API_KEY not found in environment variables');
            return false;
        }
    } catch (error) {
        console.log('⚠️ Gemini AI initialization failed:', error.message);
        return false;
    }
}

// Initialize AI on startup
initializeGeminiAI();

async function generateAIResponse(prompt) {
    try {
        if (!model) {
            return "Sorry, AI service is currently unavailable. Please try again later!";
        }

        // Add safety check for prompt
        if (!prompt || prompt.trim().length === 0) {
            return "Please provide a valid prompt for the AI to respond to!";
        }

        const result = await model.generateContent(prompt.trim());
        const response = await result.response;
        const text = response.text();

        return text || "I'm unable to generate a response right now. Please try again!";
    } catch (error) {
        console.error('AI Error:', error);
        if (error.message?.includes('API_KEY')) {
            return "AI service configuration error. Please contact the administrator.";
        }
        return "Sorry, I'm having trouble processing your request right now. Please try again later!";
    }
}

// Enhanced Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('🚀 New user connected:', socket.id);

    // ===== User joined =====
    socket.on('user-joined', (userData) => {
        try {
            let username, isDeveloper = false, isModerator = false, uid = null;

            // Handle string or object format
            if (typeof userData === 'string') {
                username = userData.trim();
            } else {
                username = userData.username ? userData.username.trim() : '';
                isDeveloper = userData.isDeveloper || false;
                isModerator = userData.isModerator || false;
                uid = userData.uid || null;
                profilePic = userData.profilePic || null;
                bio = userData.bio || null;
            }
            if (!username || username.length === 0) {
                socket.emit('error-message', { message: 'Invalid username provided' });
                return;
            }

            const cleanUsername = username.substring(0, 50);

            // Removed nested POSTS SYSTEM listeners (redundant/buggy)
            // Developer validation
            // Developer validation
            if (isDeveloper) {
                if (cleanUsername !== 'DEVELOPER') {
                    socket.emit('error-message', { message: 'Invalid developer credentials' });
                    return;
                }
            } else if (isModerator) {
                if (cleanUsername !== 'BSE SENSEX') {
                    socket.emit('error-message', { message: 'Invalid moderator credentials' });
                    return;
                }
            } else {
                if (restrictedUsernames.some(restricted => cleanUsername.toLowerCase() === restricted.toLowerCase())) {
                    socket.emit('error-message', { message: 'This username is reserved. Please choose another one.' });
                    return;
                }
            }

            // Check duplicate / Single Device Enforcement
            const existingUserEntry = Array.from(onlineUsers.entries()).find(([id, user]) => user.username.toLowerCase() === cleanUsername.toLowerCase());

            if (existingUserEntry) {
                const [oldSocketId, oldUser] = existingUserEntry;

                // CRITICAL: Only force logout if it's genuinely a DIFFERENT socket
                // This prevents false positives from reconnections/refreshes
                if (oldSocketId !== socket.id) {
                    console.log(`⚠️ User ${cleanUsername} attempting login from new device/tab.`);
                    console.log(`   Old Socket: ${oldSocketId}, New Socket: ${socket.id}`);

                    // Check if old socket is still connected
                    const oldSocket = io.sockets.sockets.get(oldSocketId);
                    if (oldSocket && oldSocket.connected) {
                        console.log(`   Old socket is connected, forcing logout.`);

                        // Notify the old session
                        io.to(oldSocketId).emit('force-logout', {
                            message: 'You have logged in from another device or tab.'
                        });

                        // Force disconnect the old socket
                        oldSocket.disconnect(true);
                    } else {
                        console.log(`   Old socket already disconnected, cleaning up stale entry.`);
                    }

                    // Clean up old entry
                    onlineUsers.delete(oldSocketId);
                } else {
                    // Same socket ID - this is a reconnection, just skip the duplicate check
                    console.log(`✓ Same socket reconnecting: ${socket.id}`);
                }
            }

            // Assign color
            const colorIndex = onlineUsers.size % userColors.length;
            const userColor = userColors[colorIndex];

            // Get client IP
            const clientIP = socket.handshake.headers['x-forwarded-for'] ||
                socket.handshake.headers['x-real-ip'] ||
                socket.conn.remoteAddress ||
                socket.handshake.address ||
                'Unknown';

            // Add user
            onlineUsers.set(socket.id, {
                username: cleanUsername,
                color: userColor,
                joinTime: new Date(),
                isDeveloper: isDeveloper,
                isModerator: isModerator,
                ip: clientIP,
                // 🎯 NEW: Stone system tracking
                totalWords: 0,
                hasReceivedStone: false,
                uid: uid,
                profilePic: profilePic,
                bio: bio,
                id: socket.id // 🎯 CRITICAL: Socket ID for DMs
            });
            // Update counts & list
            io.emit('update-online-count', onlineUsers.size);
            io.emit('online-users-list', Array.from(onlineUsers.values()));

            // Welcome message
            const welcomeMessage = isDeveloper ?
                `👑 Welcome back, Developer! You have full administrative access.` :
                `🎉 Welcome to BRO_CHATZ, ${cleanUsername}! Ready to chat with awesome people? Let's get this party started! 🚀`;

            console.log(`DEBUG: Sending welcome to ${cleanUsername} (socket: ${socket.id})`);
            socket.emit('admin-message', { message: welcomeMessage, timestamp: new Date(), type: 'welcome' });

            // Removed nested DM and Phonk listeners


            // Notify all users (except dev) of join
            if (!isDeveloper) {
                socket.broadcast.emit('user-notification', {
                    message: `${cleanUsername} entered the chatz`,
                    type: 'join',
                    username: cleanUsername,
                    color: userColor,
                    timestamp: new Date()
                });
            }

        } catch (error) {
            console.error('Error in user-joined:', error);
        }
    });

    // ===== Chat message =====
    socket.on('chat-message', (data) => {
        try {
            const user = onlineUsers.get(socket.id);
            if (!user) {
                socket.emit('error-message', { message: 'User not found. Please refresh and rejoin.' });
                return;
            }

            if (!data) return;
            const message = (data.message || '').trim();
            const hasImage = !!data.image;

            if (message.length === 0 && !hasImage) return;
            if (message.length > 1000) return;

            // 🔍 STONE SYSTEM DEBUG VERSION
            console.log('🔍 DEBUG: Message received from', user.username);

            // Skip word filter for Developer and Moderator
            if (!user.isDeveloper && !user.isModerator && containsBlockedWord(message)) {
                handleMessageViolation(socket, user);
                return;
            }

            // 🎊 STONE SYSTEM: Count words for stone eligibility
            if (user && !user.hasReceivedStone) {
                const wordCount = message.split(/\s+/).filter(word => word.length > 0).length;
                user.totalWords += wordCount;

                // Calculate time online in minutes
                const timeOnline = (new Date() - new Date(user.joinTime)) / 1000 / 60;

                // ⚙️ EDIT THESE VALUES TO CHANGE REQUIREMENTS:
                const REQUIRED_TIME = 30; // 30 SECONDS for testing (change to 30 for 30 minutes)
                const REQUIRED_WORDS = 120; // 10 words for testing (change to 150 for production)

                // 🔍 DEBUG LOGS
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('👤 User:', user.username);
                console.log('📝 Words in this message:', wordCount);
                console.log('📊 Total words so far:', user.totalWords);
                console.log('⏱️  Time online (minutes):', timeOnline.toFixed(2));
                console.log('🎯 Required time:', REQUIRED_TIME, 'minutes');
                console.log('🎯 Required words:', REQUIRED_WORDS);
                console.log('✅ Qualifies?', timeOnline >= REQUIRED_TIME && user.totalWords >= REQUIRED_WORDS);
                console.log('🎁 Already received?', user.hasReceivedStone);
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

                // 👇 NEW ULTRA RANDOM SECTION STARTS HERE
                // Check if user qualifies for a stone
                if (timeOnline >= REQUIRED_TIME && user.totalWords >= REQUIRED_WORDS) {
                    user.hasReceivedStone = true;

                    // 🎲 STONE DEFINITIONS with unique emojis
                    const stones = [
                        {
                            name: 'GRILL STONE',
                            emoji: '💎🔥',
                            description: 'The stone of charisma and charm'
                        },
                        {
                            name: 'RIZZLER STONE',
                            emoji: '✨💫',
                            description: 'The stone of ultimate rizz'
                        },
                        {
                            name: 'AURA STONE',
                            emoji: '🌟⚡',
                            description: 'The stone of powerful presence'
                        },
                        {
                            name: 'THE LOYAL BADGE',
                            emoji: '🏆👑',
                            description: 'DRIXS KA KHAAS'
                        },
                        {
                            name: 'DESTINY STONE',
                            emoji: '🔮💠',
                            description: 'The stone that shapes fate'
                        }
                    ];

                    // 🎲 CRYPTO-LEVEL RANDOMNESS
                    const getUltraRandomIndex = () => {
                        let cryptoRandom = 0;
                        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
                            const array = new Uint32Array(1);
                            crypto.getRandomValues(array);
                            cryptoRandom = array[0];
                        }

                        const timestamp = Date.now();
                        const mathRandom = Math.random() * 1000000;
                        const socketEntropy = socket.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                        const combined = (cryptoRandom + timestamp + mathRandom + socketEntropy);

                        return combined % stones.length;
                    };

                    const shuffled = stones
                        .map(stone => ({ stone, sort: Math.random() }))
                        .sort((a, b) => a.sort - b.sort)
                        .map(({ stone }) => stone);

                    const ultraRandomIndex = getUltraRandomIndex();
                    const randomStone = shuffled[ultraRandomIndex];

                    console.log('🎊 AWARDING STONE TO:', user.username);
                    console.log('🎁 Stone:', randomStone.name, randomStone.emoji);
                    console.log('🎲 Ultra-random index:', ultraRandomIndex);

                    socket.emit('stone-awarded', {
                        username: user.username,
                        stone: randomStone,
                        timestamp: new Date()
                    });

                    console.log('✅ Stone emission complete!');
                }
            }
            // AI command
            if (message.startsWith('/ai ')) {
                const aiPrompt = message.substring(4).trim();
                if (aiPrompt.length === 0) {
                    socket.emit('ai-response', {
                        prompt: aiPrompt,
                        response: "Please provide a prompt after /ai command.",
                        timestamp: new Date()
                    });
                    return;
                }
                socket.emit('ai-typing', true);
                generateAIResponse(aiPrompt).then(aiResponse => {
                    socket.emit('ai-typing', false);
                    socket.emit('ai-response', { prompt: aiPrompt, response: aiResponse, timestamp: new Date() });
                }).catch(error => {
                    console.error('AI response error:', error);
                    socket.emit('ai-typing', false);
                    socket.emit('ai-response', { prompt: aiPrompt, response: "AI error, try again!", timestamp: new Date() });
                });
            } else {
                // Normal chat
                const messageData = {
                    username: user.username,
                    message: message,
                    color: user.color,
                    timestamp: new Date(),
                    messageId: Date.now() + Math.random(),
                    replyTo: data.replyTo || null,
                    isDeveloper: user.isDeveloper,
                    isModerator: user.isModerator,
                    uid: user.uid,
                    profilePic: user.profilePic,
                    image: data.image // 🔥 CRITICAL: Include the image!
                };
                io.emit('chat-message', messageData);
            }
        } catch (error) {
            console.error('Error in chat-message:', error);
        }
    });

    // ===== Typing =====
    socket.on('typing-start', () => {
        try {
            const user = onlineUsers.get(socket.id);
            if (user) {
                socket.broadcast.emit('user-typing', { username: user.username, color: user.color, isTyping: true });
            }
        } catch (error) { console.error('Error in typing-start:', error); }
    });

    socket.on('typing-stop', () => {
        try {
            const user = onlineUsers.get(socket.id);
            if (user) {
                socket.broadcast.emit('user-typing', { username: user.username, color: user.color, isTyping: false });
            }
        } catch (error) { console.error('Error in typing-stop:', error); }
    });

    // ===== Message reaction =====
    socket.on('message-reaction', (data) => {
        try {
            const user = onlineUsers.get(socket.id);
            if (user && data && data.messageId && data.emoji) {
                io.emit('message-reaction', { messageId: data.messageId, emoji: data.emoji, username: user.username, color: user.color, timestamp: new Date() });
            }
        } catch (error) { console.error('Error in message-reaction:', error); }
    });

    // ===== Update Profile =====
    socket.on('update-profile', (data) => {
        try {
            const user = onlineUsers.get(socket.id);
            if (user) {
                user.username = data.username || user.username;
                user.profilePic = data.profilePic || user.profilePic;
                user.bio = data.bio || user.bio;
                // Broadcast updated user list
                io.emit('online-users-list', Array.from(onlineUsers.values()));
            }
        } catch (error) {
            console.error('Error in update-profile:', error);
        }
    });

    // ===== Online users =====
    socket.on('get-online-users', () => {
        socket.emit('online-users-list', Array.from(onlineUsers.values()));
    });

    // ===== WARN user (DEV) =====
    socket.on('warn-user', (data) => {
        try {
            const { username, reason } = data;
            const userEntry = [...onlineUsers.entries()].find(([id, u]) => u.username === username);
            if (userEntry) {
                const [targetId, user] = userEntry;
                io.to(targetId).emit('user-warned', { username, reason });
                console.log(`⚠️ ${username} warned: ${reason}`);
            }
        } catch (err) { console.error('Error in warn-user:', err); }
    });

    // ===== KICK user (DEV) =====
    socket.on('kick-user', (data) => {
        try {
            const { username } = data;
            const userEntry = [...onlineUsers.entries()].find(([id, u]) => u.username === username);
            if (userEntry) {
                const [targetId, user] = userEntry;

                // Send admin-action to properly handle kick
                io.to(targetId).emit('admin-action', {
                    action: 'kick',
                    reason: 'Kicked by admin'
                });

                // Also send kick notification to all users
                io.emit('kick-notification', { username });

                // Disconnect the user
                io.sockets.sockets.get(targetId)?.disconnect(true);
                onlineUsers.delete(targetId);

                io.emit('update-online-count', onlineUsers.size);
                io.emit('online-users-list', Array.from(onlineUsers.values()));

                console.log(`🚫 ${username} kicked out`);
            }
        } catch (err) { console.error('Error in kick-user:', err); }
    });

    // ===== Get users for DM =====
    socket.on('get-users-for-dm', () => {
        const users = Array.from(onlineUsers.values()).map(user => ({
            id: [...onlineUsers.entries()].find(([id, u]) => u.username === user.username)?.[0],
            username: user.username,
            color: user.color,
            isDeveloper: user.isDeveloper,
            uid: user.uid,
            profilePic: user.profilePic
        }));
        socket.emit('users-for-dm', users);
    });

    // ===== DM Message =====
    socket.on('dm-message', (data) => {
        try {
            const sender = onlineUsers.get(socket.id);
            if (!sender) return;

            const { targetUserId, message, messageId, isGIF } = data;
            const targetUser = onlineUsers.get(targetUserId);
            if (!targetUser) return;

            const messageData = {
                senderId: socket.id,
                targetUserId: targetUserId,
                senderName: sender.username,
                senderColor: sender.color,
                message: message,
                messageId: messageId,
                timestamp: new Date(),
                isGIF: isGIF || false,
                image: data.image, // 🔥 CRITICAL: Include the image!
                status: 'delivered'
            };

            const conversationId = [socket.id, targetUserId].sort().join('-');
            if (!dmMessages.has(conversationId)) dmMessages.set(conversationId, []);
            dmMessages.get(conversationId).push(messageData);

            io.to(targetUserId).emit('dm-message', messageData);
            socket.emit('dm-message', { ...messageData, isOwn: true });
            socket.emit('dm-message-status', { messageId: messageId, status: 'delivered' });
        } catch (error) { console.error('Error in dm-message:', error); }
    });

    // ===== DM Typing =====
    socket.on('dm-typing-start', (data) => {
        const user = onlineUsers.get(socket.id);
        if (!user) return;
        const { targetUserId } = data;
        io.to(targetUserId).emit('dm-typing-start', { senderId: socket.id, username: user.username, color: user.color });
    });

    socket.on('dm-typing-stop', (data) => {
        const user = onlineUsers.get(socket.id);
        if (!user) return;
        const { targetUserId } = data;
        io.to(targetUserId).emit('dm-typing-stop', { senderId: socket.id, username: user.username });
    });

    // ===== DM Message Read =====
    socket.on('dm-message-read', (data) => {
        const { senderId, messageId } = data;
        io.to(senderId).emit('dm-message-status', { messageId: messageId, status: 'read' });
        const conversationId = [socket.id, senderId].sort().join('-');
        const messages = dmMessages.get(conversationId);
        if (messages) {
            const message = messages.find(msg => msg.messageId === messageId);
            if (message) message.status = 'read';
        }
    });

    // ===== Delete DM Message =====
    socket.on('delete-dm-message', (data) => {
        const { targetUserId, messageId } = data;
        const conversationId = [socket.id, targetUserId].sort().join('-');
        const messages = dmMessages.get(conversationId);
        if (messages) {
            const index = messages.findIndex(msg => msg.messageId === messageId);
            if (index > -1) messages.splice(index, 1);
        }
        io.to(targetUserId).emit('dm-message-deleted', { messageId: messageId, senderId: socket.id });
    });

    // ===== DM Reactions =====
    socket.on('dm-reaction', (data) => {
        const user = onlineUsers.get(socket.id);
        if (!user) return;
        const { targetUserId, messageId, emoji } = data;
        io.to(targetUserId).emit('dm-reaction', {
            senderId: socket.id,
            senderName: user.username,
            senderColor: user.color,
            messageId: messageId,
            emoji: emoji,
            timestamp: new Date()
        });
    });

    // ===== Phonk broadcasting (DEV) =====
    socket.on("changePhonk", (trackPath) => {
        const user = onlineUsers.get(socket.id);
        if (user && user.isDeveloper) {
            currentPhonk = trackPath;
            io.emit("playPhonk", { track: currentPhonk });
            console.log(`🎵 Phonk changed to: ${trackPath}`);
        }
    });

    // ================= POSTS SYSTEM SERVER HANDLERS =================

    // ===== Create Post =====
    socket.on('create-post', (postData) => {
        try {
            console.log('📝 SERVER: create-post received from socket', socket.id, 'Data:', postData);
            const user = onlineUsers.get(socket.id);
            console.log('📝 SERVER: User lookup result:', user ? user.username : 'NOT_FOUND');
            if (!user) {
                console.log('❌ SERVER: User not found for socket', socket.id);
                socket.emit('post-creation-ack', { success: false, error: 'User not found. Try refreshing.' });
                return;
            }

            // Validate post data
            if (!postData.content || postData.content.trim().length === 0) {
                socket.emit('error-message', { message: 'Post content cannot be empty' });
                return;
            }

            if (postData.content.length > 500) {
                socket.emit('error-message', { message: 'Post content too long (max 500 characters)' });
                return;
            }

            // Create post object
            const post = {
                id: postData.id || (Date.now() + '-' + Math.random().toString(36).substr(2, 9)),
                content: postData.content.trim(),
                image: postData.image || null,
                author: user.username,
                authorColor: user.color,
                isDeveloper: user.isDeveloper,
                timestamp: new Date(),
                reactions: {},
                impressions: 0,
                likedBy: new Set() // Initialize likes tracking
            };

            // Store post
            postsStorage.set(post.id, post);
            postComments.set(post.id, []);
            postReactions.set(post.id, {});

            // Broadcast to all users
            io.emit('post-created', post);

            // Ack to sender
            socket.emit('post-creation-ack', { success: true, postId: post.id });

            console.log(`📝 New post created by ${user.username}: ${post.content.substring(0, 50)}...`);

        } catch (error) {
            console.error('Error in create-post:', error);
            socket.emit('post-creation-ack', { success: false, error: 'Server error' });
            socket.emit('error-message', { message: 'Failed to create post' });
        }
    });

    // ===== Edit Post =====
    socket.on('edit-post', (data) => {
        try {
            const user = onlineUsers.get(socket.id);
            if (!user) return;

            const { postId, content } = data;
            const post = postsStorage.get(postId);

            if (!post) {
                socket.emit('error-message', { message: 'Post not found' });
                return;
            }

            // Check ownership
            if (post.author !== user.username && !user.isDeveloper) {
                socket.emit('error-message', { message: 'You can only edit your own posts' });
                return;
            }

            // Validate content
            if (!content || content.trim().length === 0) {
                socket.emit('error-message', { message: 'Post content cannot be empty' });
                return;
            }

            if (content.length > 500) {
                socket.emit('error-message', { message: 'Post content too long' });
                return;
            }

            // Update post
            post.content = content.trim();
            post.edited = true;
            post.editedAt = new Date();

            // Broadcast update
            io.emit('post-updated', {
                postId: postId,
                content: post.content,
                edited: true,
                editedAt: post.editedAt
            });

            console.log(`✏️ Post edited by ${user.username}: ${postId}`);

        } catch (error) {
            console.error('Error in edit-post:', error);
        }
    });

    // ===== Delete Post =====
    socket.on('delete-post', (data) => {
        try {
            const user = onlineUsers.get(socket.id);
            if (!user) return;

            const { postId } = data;
            const post = postsStorage.get(postId);

            if (!post) {
                socket.emit('error-message', { message: 'Post not found' });
                return;
            }

            // Check ownership or developer privileges
            if (post.author !== user.username && !user.isDeveloper) {
                socket.emit('error-message', { message: 'You can only delete your own posts' });
                return;
            }

            // Delete post and related data
            postsStorage.delete(postId);
            postComments.delete(postId);
            postReactions.delete(postId);

            // Broadcast deletion
            io.emit('post-deleted', { postId: postId });

            console.log(`🗑️ Post deleted by ${user.username}: ${postId}`);

        } catch (error) {
            console.error('Error in delete-post:', error);
        }
    });

    // ===== Post Comment =====
    socket.on('post-comment', (commentData) => {
        try {
            const user = onlineUsers.get(socket.id);
            if (!user) return;

            // Validate comment
            if (!commentData.content || commentData.content.trim().length === 0) {
                socket.emit('error-message', { message: 'Comment cannot be empty' });
                return;
            }

            if (commentData.content.length > 300) {
                socket.emit('error-message', { message: 'Comment too long (max 300 characters)' });
                return;
            }

            const post = postsStorage.get(commentData.postId);
            if (!post) {
                socket.emit('error-message', { message: 'Post not found' });
                return;
            }

            // Create comment object
            const comment = {
                id: commentData.id,
                postId: commentData.postId,
                content: commentData.content.trim(),
                author: user.username,
                authorColor: user.color,
                isDeveloper: user.isDeveloper,
                timestamp: new Date()
            };

            // Store comment
            if (!postComments.has(commentData.postId)) {
                postComments.set(commentData.postId, []);
            }
            postComments.get(commentData.postId).push(comment);

            // Broadcast comment
            io.emit('post-comment', comment);

            // Notify post author if different user
            if (post.author !== user.username) {
                const authorSocket = [...onlineUsers.entries()].find(([id, u]) => u.username === post.author);
                if (authorSocket) {
                    io.to(authorSocket[0]).emit('comment-notification', {
                        commenterName: user.username,
                        postId: commentData.postId,
                        message: `${user.username} commented on your post`
                    });
                }
            }

            console.log(`💬 New comment by ${user.username} on post ${commentData.postId}`);

        } catch (error) {
            console.error('Error in post-comment:', error);
        }
    });

    // ===== Post Reaction =====
    socket.on('post-reaction', (data) => {
        try {
            const user = onlineUsers.get(socket.id);
            if (!user) return;

            const { postId, emoji } = data;
            const post = postsStorage.get(postId);

            if (!post) return;

            // Get current reactions for this post
            let reactions = postReactions.get(postId) || {};
            let userReactions = reactions[user.username] || [];

            // Toggle reaction
            if (userReactions.includes(emoji)) {
                // Remove reaction
                reactions[emoji] = Math.max(0, (reactions[emoji] || 0) - 1);
                userReactions = userReactions.filter(r => r !== emoji);
            } else {
                // Add reaction
                reactions[emoji] = (reactions[emoji] || 0) + 1;
                userReactions.push(emoji);
            }

            reactions[user.username] = userReactions;
            postReactions.set(postId, reactions);

            // Broadcast reaction update
            io.emit('post-reaction', {
                postId: postId,
                emoji: emoji,
                count: reactions[emoji],
                username: user.username
            });

            console.log(`👍 Reaction ${emoji} by ${user.username} on post ${postId}`);

        } catch (error) {
            console.error('Error in post-reaction:', error);
        }
    });

    // ===== Post Impression =====
    socket.on('post-impression', (data) => {
        try {
            const { postId } = data;
            const post = postsStorage.get(postId);

            if (post) {
                post.impressions = (post.impressions || 0) + 1;

                // Optionally broadcast impression update
                io.emit('post-impression-update', {
                    postId: postId,
                    impressions: post.impressions
                });
            }
        } catch (error) {
            console.error('Error in post-impression:', error);
        }
    });

    // ===== Get All Posts (with filtering) =====
    socket.on('get-posts', (data) => {
        try {
            console.log('📝 SERVER: get-posts received', data);
            const filterType = data && data.type ? data.type : 'featured'; // 'featured' or 'user'
            const user = onlineUsers.get(socket.id);

            let posts = Array.from(postsStorage.values())
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            // Filter if requested
            if (filterType === 'user' && user) {
                posts = posts.filter(p => p.author === user.username);
            }

            // Transform to match client expectations
            const transformedPosts = posts.map(p => ({
                id: p.id,
                content: p.content,
                imageUrl: p.image,
                username: p.author,
                userId: p.author, // Using author as userId
                timestamp: p.timestamp,
                likes: p.likedBy ? p.likedBy.size : 0,
                commentCount: (postComments.get(p.id) || []).length
            }));

            console.log(`📝 SERVER: Sending ${transformedPosts.length} posts to client`);
            socket.emit('posts-list', transformedPosts);
        } catch (error) {
            console.error('Error in get-posts:', error);
        }
    });

    // ===== Toggle Post Like =====
    socket.on('toggle-post-like', (data) => {
        try {
            const user = onlineUsers.get(socket.id);
            if (!user) return;

            const { postId } = data;
            const post = postsStorage.get(postId);

            if (!post) {
                // socket.emit('error-message', { message: 'Post not found' });
                return;
            }

            // Init likes set if not exists
            if (!post.likedBy) {
                post.likedBy = new Set();
            }

            let liked = false;
            if (post.likedBy.has(user.username)) {
                post.likedBy.delete(user.username);
                liked = false;
            } else {
                post.likedBy.add(user.username);
                liked = true;
            }

            // Update count
            post.likes = post.likedBy.size;

            // Broadcast update
            io.emit('post-like-updated', {
                postId: postId,
                liked: liked,
                likes: post.likes,
                username: user.username // Who performed the action
            });

            // Should also tell the specific user their state if needed, 
            // but the client usually handles the toggle visual immediately or waits for server.
            // In this case, we broadcast to everyone so the UI updates.

        } catch (error) {
            console.error('Error in toggle-post-like:', error);
        }
    });

    // ===== Get Post Comments =====
    socket.on('get-post-comments', (data) => {
        try {
            const { postId } = data;
            const comments = postComments.get(postId) || [];

            socket.emit('post-comments', {
                postId: postId,
                comments: comments
            });
        } catch (error) {
            console.error('Error in get-post-comments:', error);
        }
    });

    // ===== Add Comment =====
    socket.on('add-comment', (data) => {
        try {
            const user = onlineUsers.get(socket.id);
            if (!user) return;

            const { postId, content, id } = data;

            // Validate
            if (!content || content.trim().length === 0) {
                socket.emit('error-message', { message: 'Comment cannot be empty' });
                return;
            }

            if (content.length > 300) {
                socket.emit('error-message', { message: 'Comment too long (max 300 characters)' });
                return;
            }

            const post = postsStorage.get(postId);
            if (!post) {
                socket.emit('error-message', { message: 'Post not found' });
                return;
            }

            // Create comment
            const comment = {
                id: id || (Date.now() + '-' + Math.random().toString(36).substr(2, 9)),
                postId: postId,
                content: content.trim(),
                username: user.username,
                color: user.color,
                timestamp: new Date()
            };

            // Store comment
            if (!postComments.has(postId)) {
                postComments.set(postId, []);
            }
            postComments.get(postId).push(comment);

            // Broadcast comment added event
            io.emit('comment-added', {
                postId: postId,
                comment: comment
            });

            console.log(`💬 Comment added by ${user.username} on post ${postId}`);

        } catch (error) {
            console.error('Error in add-comment:', error);
        }
    });


    // ================= TIC-TAC-TOE GAME SYSTEM (SERVER) =================
    // ===== Get TTT Opponents =====
    socket.on('get-ttt-opponents', () => {
        const users = Array.from(onlineUsers.entries()).map(([id, user]) => ({
            id: id,
            username: user.username,
            color: user.color,
            isDeveloper: user.isDeveloper,
            inGame: userGameStatus.has(id)
        }));
        socket.emit('ttt-opponents-list', users);
    });

    // ===== Challenge Sent =====
    socket.on('ttt-challenge-sent', (data) => {
        try {
            const challenger = onlineUsers.get(socket.id);
            if (!challenger) return;

            // Send challenge to opponent
            io.to(data.opponentId).emit('ttt-challenge-received', {
                challengerId: socket.id,
                challengerName: data.challengerName,
                challengerColor: data.challengerColor
            });

            console.log(`🎮 ${data.challengerName} challenged ${data.opponentName} for Tic-Tac-Toe`);
        } catch (error) {
            console.error('Error in ttt-challenge-sent:', error);
        }
    });

    // ===== Challenge Accepted =====
    socket.on('ttt-challenge-accepted', (data) => {
        try {
            const accepter = onlineUsers.get(socket.id);
            const challenger = onlineUsers.get(data.challengerId);

            if (!accepter || !challenger) return;

            // Create game
            const gameId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);

            // Randomly assign X and O
            const isChallenger_X = Math.random() < 0.5;
            const challengerSymbol = isChallenger_X ? 'X' : 'O';
            const accepterSymbol = isChallenger_X ? 'O' : 'X';

            // X always goes first
            const challengerTurn = isChallenger_X;

            const game = {
                id: gameId,
                player1: {
                    id: data.challengerId,
                    name: challenger.username,
                    color: challenger.color,
                    symbol: challengerSymbol
                },
                player2: {
                    id: socket.id,
                    name: accepter.username,
                    color: accepter.color,
                    symbol: accepterSymbol
                },
                board: Array(9).fill(null),
                currentTurn: challengerSymbol,
                active: true
            };

            activeGames.set(gameId, game);
            userGameStatus.set(data.challengerId, gameId);
            userGameStatus.set(socket.id, gameId);

            // Notify both players
            io.to(data.challengerId).emit('ttt-game-started', {
                gameId: gameId,
                opponent: {
                    name: accepter.username,
                    color: accepter.color,
                    id: socket.id
                },
                mySymbol: challengerSymbol,
                opponentSymbol: accepterSymbol,
                isMyTurn: challengerTurn
            });

            io.to(socket.id).emit('ttt-game-started', {
                gameId: gameId,
                opponent: {
                    name: challenger.username,
                    color: challenger.color,
                    id: data.challengerId
                },
                mySymbol: accepterSymbol,
                opponentSymbol: challengerSymbol,
                isMyTurn: !challengerTurn
            });

            // Update game status for all users
            io.emit('user-game-status-updated', { username: challenger.username, inGame: true });
            io.emit('user-game-status-updated', { username: accepter.username, inGame: true });

            console.log(`🎮 Game started: ${challenger.username} vs ${accepter.username}`);
        } catch (error) {
            console.error('Error in ttt-challenge-accepted:', error);
        }
    });

    // ===== Challenge Declined =====
    socket.on('ttt-challenge-declined', (data) => {
        try {
            io.to(data.challengerId).emit('ttt-challenge-declined', {
                declinerName: data.declinerName
            });

            console.log(`❌ ${data.declinerName} declined challenge`);
        } catch (error) {
            console.error('Error in ttt-challenge-declined:', error);
        }
    });

    // ===== Challenge Timeout =====
    socket.on('ttt-challenge-timeout', (data) => {
        try {
            io.to(data.challengerId).emit('ttt-challenge-timeout');
            console.log(`⏰ Challenge timeout`);
        } catch (error) {
            console.error('Error in ttt-challenge-timeout:', error);
        }
    });

    // ===== Move Made =====
    // ===== Move Made =====
    socket.on('ttt-move-made', (data) => {
        try {
            console.log('🎮 SERVER: Received move from', socket.id, 'at index', data.index);

            const game = activeGames.get(data.gameId);
            if (!game || !game.active) {
                console.log('❌ SERVER: Game not found or inactive:', data.gameId);
                return;
            }

            // Find which player made the move
            const player = game.player1.id === socket.id ? game.player1 : game.player2;

            // Verify it's their turn
            if (game.currentTurn !== player.symbol) {
                console.log(`❌ SERVER: Invalid turn - ${player.name} tried to play but it's ${game.currentTurn}'s turn`);
                return;
            }

            // Update server board
            game.board[data.index] = data.symbol;
            console.log('✅ SERVER: Board updated at index', data.index, 'with', data.symbol);

            // Switch turn
            game.currentTurn = game.currentTurn === 'X' ? 'O' : 'X';
            console.log('✅ SERVER: Turn switched to', game.currentTurn);

            // Get opponent ID
            const opponentId = game.player1.id === socket.id ? game.player2.id : game.player1.id;
            const opponent = game.player1.id === socket.id ? game.player2 : game.player1;

            console.log('📤 SERVER: Sending move to opponent', opponent.name, '(', opponentId, ')');

            // Send move to opponent
            io.to(opponentId).emit('ttt-opponent-move', {
                gameId: data.gameId,
                index: data.index,
                symbol: data.symbol,
                board: game.board
            });

            console.log('✅ SERVER: Move sent successfully');

        } catch (error) {
            console.error('❌ SERVER: Error in ttt-move-made:', error);
        }
    });
    // ===== Replay Request =====
    socket.on('ttt-replay-request', (data) => {
        try {
            const game = activeGames.get(data.gameId);
            if (!game) return;

            const opponentId = game.player1.id === socket.id ? game.player2.id : game.player1.id;

            io.to(opponentId).emit('ttt-replay-request-received', {
                gameId: data.gameId,
                requesterId: socket.id,
                requesterName: data.requesterName
            });

            console.log(`🔄 Replay requested by ${data.requesterName}`);
        } catch (error) {
            console.error('Error in ttt-replay-request:', error);
        }
    });

    // ===== Replay Accepted =====
    socket.on('ttt-replay-accepted', (data) => {
        try {
            const game = activeGames.get(data.gameId);
            if (!game) return;

            // Reset game
            game.board = Array(9).fill(null);
            game.active = true;

            // Randomly decide who goes first
            const player1First = Math.random() < 0.5;
            game.currentTurn = player1First ? game.player1.symbol : game.player2.symbol;

            // Notify both players
            io.to(game.player1.id).emit('ttt-replay-accepted', {
                gameId: data.gameId,
                isMyTurn: player1First
            });

            io.to(game.player2.id).emit('ttt-replay-accepted', {
                gameId: data.gameId,
                isMyTurn: !player1First
            });

            console.log(`🔄 Replay started for game ${data.gameId}`);
        } catch (error) {
            console.error('Error in ttt-replay-accepted:', error);
        }
    });

    // ===== Replay Declined =====
    socket.on('ttt-replay-declined', (data) => {
        try {
            io.to(data.requesterId).emit('ttt-replay-declined', {
                declinerName: data.declinerName
            });

            console.log(`❌ Replay declined by ${data.declinerName}`);
        } catch (error) {
            console.error('Error in ttt-replay-declined:', error);
        }
    });

    // ===== Player Left =====
    socket.on('ttt-player-left', (data) => {
        try {
            const game = activeGames.get(data.gameId);
            if (!game) return;

            const opponentId = game.player1.id === socket.id ? game.player2.id : game.player1.id;
            const opponent = onlineUsers.get(opponentId);

            // Notify opponent
            io.to(opponentId).emit('ttt-opponent-left', {
                playerName: data.playerName
            });

            // Clean up game
            game.active = false;
            activeGames.delete(data.gameId);
            userGameStatus.delete(socket.id);
            userGameStatus.delete(opponentId);

            // Update game status
            if (opponent) {
                io.emit('user-game-status-updated', { username: opponent.username, inGame: false });
            }

            const user = onlineUsers.get(socket.id);
            if (user) {
                io.emit('user-game-status-updated', { username: user.username, inGame: false });
            }

            console.log(`🚪 ${data.playerName} left the game`);
        } catch (error) {
            console.error('Error in ttt-player-left:', error);
        }
    });

    // ===== Game Ended =====
    socket.on('ttt-game-ended', () => {
        try {
            const gameId = userGameStatus.get(socket.id);
            if (!gameId) return;

            const game = activeGames.get(gameId);
            if (game) {
                const opponentId = game.player1.id === socket.id ? game.player2.id : game.player1.id;
                const opponent = onlineUsers.get(opponentId);

                // Clean up
                game.active = false;
                activeGames.delete(gameId);
                userGameStatus.delete(socket.id);
                userGameStatus.delete(opponentId);

                // Update game status
                if (opponent) {
                    io.emit('user-game-status-updated', { username: opponent.username, inGame: false });
                }

                const user = onlineUsers.get(socket.id);
                if (user) {
                    io.emit('user-game-status-updated', { username: user.username, inGame: false });
                }
            }
        } catch (error) {
            console.error('Error in ttt-game-ended:', error);
        }
    });

    // ===== CLEAN UP ON DISCONNECT =====
    // (This should be added to your existing disconnect handler)
    // Add this code inside your existing socket.on('disconnect') handler:

    /*
    // Clean up any active games
    const gameId = userGameStatus.get(socket.id);
    if (gameId) {
        const game = activeGames.get(gameId);
        if (game) {
            const opponentId = game.player1.id === socket.id ? game.player2.id : game.player1.id;
            const opponent = onlineUsers.get(opponentId);
            
            // Notify opponent
            if (opponent) {
                io.to(opponentId).emit('ttt-opponent-left', {
                    playerName: user.username
                });
                io.emit('user-game-status-updated', { username: opponent.username, inGame: false });
            }
            
            // Clean up
            activeGames.delete(gameId);
            userGameStatus.delete(socket.id);
            userGameStatus.delete(opponentId);
        }
    }
    */
    // ===== Disconnect =====
    // ===== Disconnect =====
    socket.on('disconnect', () => {
        try {
            const user = onlineUsers.get(socket.id);
            if (user) {
                // Broadcast exit popup
                socket.broadcast.emit('user-notification', {
                    message: `${user.username} exited the chatz`,
                    type: 'exit',
                    username: user.username,
                    color: user.color,
                    timestamp: new Date()
                });
            }

            // Clean up any active games (TIC-TAC-TOE)
            const gameId = userGameStatus.get(socket.id);
            if (gameId) {
                const game = activeGames.get(gameId);
                if (game && user) {
                    const opponentId = game.player1.id === socket.id ? game.player2.id : game.player1.id;
                    const opponent = onlineUsers.get(opponentId);

                    // Notify opponent
                    if (opponent) {
                        io.to(opponentId).emit('ttt-opponent-left', {
                            playerName: user.username
                        });
                        io.emit('user-game-status-updated', { username: opponent.username, inGame: false });
                    }

                    // Clean up
                    activeGames.delete(gameId);
                    userGameStatus.delete(socket.id);
                    userGameStatus.delete(opponentId);
                }
            }

            onlineUsers.delete(socket.id);

            // Update counts
            io.emit('update-online-count', onlineUsers.size);
            io.emit('online-users-list', Array.from(onlineUsers.values()));

            console.log(`User disconnected: ${socket.id}`);
        } catch (err) {
            console.error('Error in disconnect:', err);
        }
    });


    // ===== Connection errors =====
    socket.on('error', (error) => {
        console.error('Socket error for', socket.id, ':', error);
    });
});


// Enhanced error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit the process in production
    if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

// Start server with enhanced configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`🚀 BRO_CHATZ Server running on ${HOST}:${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔑 Gemini AI: ${process.env.GEMINI_API_KEY ? 'Enabled' : 'Disabled'}`);
    console.log(`📊 Node.js version: ${process.version}`);
    console.log(`🕒 Server started at: ${new Date().toISOString()}`);
}).on('error', (error) => {
    console.error('Server failed to start:', error);
    process.exit(1);
});
