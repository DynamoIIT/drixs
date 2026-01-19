// ===================================
// DRIXY AI CHAT LOGIC
// ===================================

const DrixyAI = {
    modal: null,
    messagesContainer: null,
    input: null,
    sendBtn: null,
    thinkingIndicator: null,
    isProcessing: false,
    historyLoaded: false,

    init() {
        // Create Modal HTML if not exists
        if (!document.getElementById('drixyAIModal')) {
            this.createModal();
        }

        // Cache DOM elements
        this.cacheDOM();

        // Bind Events
        this.bindEvents();
    },

    createModal() {
        const modalHTML = `
            <div id="drixyAIModal">
                <div class="drixy-chat-window">
                    <div class="drixy-chat-header">
                        <div class="drixy-header-title">
                            <i class="fas fa-robot drixy-icon-spin"></i>
                            <span class="ai-text">Drixy AI</span>
                        </div>
                        <button class="drixy-close-btn" id="drixyCloseBtn">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="drixy-chat-messages" id="drixyMessages">
                        <!-- Messages will appear here -->
                    </div>

                    <div class="drixy-thinking" id="drixyThinking">
                        <div class="thinking-bubble"></div>
                        <div class="thinking-bubble"></div>
                        <div class="thinking-bubble"></div>
                    </div>

                    <div class="drixy-input-area">
                        <div class="drixy-input-wrapper">
                            <textarea id="drixyInput" rows="1" placeholder="Ask Drixy something..."></textarea>
                        </div>
                        <button id="drixySendBtn" disabled>
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    cacheDOM() {
        this.modal = document.getElementById('drixyAIModal');
        this.messagesContainer = document.getElementById('drixyMessages');
        this.input = document.getElementById('drixyInput');
        this.sendBtn = document.getElementById('drixySendBtn');
        this.thinkingIndicator = document.getElementById('drixyThinking');
    },

    bindEvents() {
        // Close Modal
        document.getElementById('drixyCloseBtn').addEventListener('click', () => this.close());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        // Send Message
        this.sendBtn.addEventListener('click', () => this.sendMessage());

        // External Trigger: Menu Button
        const menuBtn = document.getElementById('drixyAIMenuBar');
        if (menuBtn) {
            menuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.open();
                // Close hamburger menu and overlay if open
                const menu = document.getElementById('hamburgerMenu');
                const overlay = document.getElementById('menuOverlay');
                if (menu) menu.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
                if (overlay) overlay.style.display = 'none'; // Ensure it hides
            });
        }

        // Input Handling
        this.input.addEventListener('input', () => {
            this.adjustTextareaHeight();
            this.sendBtn.disabled = this.input.value.trim() === '' || this.isProcessing;
        });

        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!this.sendBtn.disabled) this.sendMessage();
            }
        });
    },

    open() {
        this.modal.style.display = 'flex';
        // Force reflow for transition
        setTimeout(() => this.modal.classList.add('show'), 10);
        this.input.focus();

        // Load History if not loaded
        if (!this.historyLoaded && window.supabaseUser) {
            this.loadHistory();
        } else if (!this.historyLoaded) {
            // If no user triggered (shouldn't happen in app), show intro
            this.showWelcomeMessage();
        }
    },

    close() {
        this.modal.classList.remove('show');
        setTimeout(() => {
            this.modal.style.display = 'none';
        }, 300);
    },

    adjustTextareaHeight() {
        this.input.style.height = 'auto';
        this.input.style.height = Math.min(this.input.scrollHeight, 100) + 'px';
    },

    async loadHistory() {
        this.messagesContainer.innerHTML = '';
        this.addDateSeparator('Loading secure history...');

        try {
            const userId = window.supabaseUser.id;
            const response = await fetch(`/api/chat/history/${userId}`);
            const data = await response.json();

            this.messagesContainer.innerHTML = ''; // Clear loading msg

            if (data.success && data.messages.length > 0) {
                let lastDate = null;

                data.messages.forEach(msg => {
                    const date = new Date(msg.created_at);
                    const dayStr = this.formatDate(date);

                    if (dayStr !== lastDate) {
                        this.addDateSeparator(dayStr);
                        lastDate = dayStr;
                    }

                    this.appendMessage(msg.role, msg.content, false); // false = no typing effect
                });
            } else {
                this.showWelcomeMessage();
            }

            this.historyLoaded = true;
            this.scrollToBottom();

        } catch (error) {
            console.error('Failed to load history:', error);
            this.addDateSeparator('Error connecting to Drixy Memory Core');
            this.showWelcomeMessage();
        }
    },

    showWelcomeMessage() {
        const username = window.currentUser || 'User';
        const welcomeText = `Hey There ${username} ..wanna talk about something?!`;

        // Slight delay for effect
        setTimeout(() => {
            this.appendMessage('assistant', welcomeText, true);
        }, 500);
    },

    async sendMessage() {
        const text = this.input.value.trim();
        if (!text || this.isProcessing) return;

        // UI Updates
        this.input.value = '';
        this.input.style.height = 'auto';
        this.sendBtn.disabled = true;
        this.isProcessing = true;

        // Add User Message
        this.appendMessage('user', text);
        this.scrollToBottom();

        // Show Thinking Indicator
        this.showThinking();

        try {
            const userId = window.supabaseUser?.id;

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    userId: userId,
                    sessionId: 'default-session' // Can be random UUID 
                })
            });

            if (!response.ok) throw new Error('Network error');

            const data = await response.json();

            // Hide Thinking
            this.hideThinking();

            // Add AI response with typing effect
            if (data.success && data.response) {
                await this.typeMessage(data.response);
            } else {
                this.appendMessage('assistant', "I'm having trouble connecting to my neural network right now. 🔌");
            }

        } catch (error) {
            console.error('Chat Error:', error);
            this.hideThinking();
            this.appendMessage('assistant', "Connection interrupted. Please try again. ⚠️");
        } finally {
            this.isProcessing = false;
        }
    },

    appendMessage(role, text, withTyping = false) {
        if (withTyping) {
            this.typeMessage(text);
            return;
        }

        const div = document.createElement('div');
        div.className = `drixy-message ${role}`;

        // Format content (basic markdown support could go here)
        div.textContent = text;

        this.messagesContainer.appendChild(div);
        this.scrollToBottom();
    },

    async typeMessage(text) {
        const div = document.createElement('div');
        div.className = `drixy-message assistant`;
        this.messagesContainer.appendChild(div);

        // Typing loop
        for (let i = 0; i < text.length; i++) {
            div.textContent = text.substring(0, i + 1);
            div.innerHTML += '<span class="typing-cursor"></span>';
            this.scrollToBottom();

            // Vary typing speed for realism (10-30ms)
            const speed = Math.random() * 20 + 10;
            await new Promise(r => setTimeout(r, speed));
        }

        // Remove cursor at end
        div.innerHTML = div.textContent;
    },

    showThinking() {
        this.thinkingIndicator.classList.add('active');
        this.scrollToBottom();
    },

    hideThinking() {
        this.thinkingIndicator.classList.remove('active');
    },

    addDateSeparator(text) {
        const div = document.createElement('div');
        div.className = 'drixy-date-separator';
        div.textContent = text;
        this.messagesContainer.appendChild(div);
    },

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    },

    formatDate(date) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString();
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    DrixyAI.init();
});

// Expose open function globally for the menu button
window.openDrixyAI = () => DrixyAI.open();
