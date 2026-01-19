// ================= FROSTED GLASS POSTS SYSTEM =================

// Posts State
const PostsState = {
    posts: new Map(),
    currentView: 'feed',  // 'feed' or 'my-posts'
    currentPostId: null,
    selectedImage: null
};

// Initialize Posts System
function initializeFrostedPosts() {
    console.log('ðŸŸ¢ Frosted Posts System Initializing...');
    const socialContainer = document.getElementById('socialContainer');
    const createPostBtn = document.getElementById('createPostBtn');
    const createPostModal = document.getElementById('createPostModal');
    const commentsModal = document.getElementById('commentsModal');
    const closeSocialBtn = document.getElementById('closeSocialBtn');

    console.log('ðŸŸ¢ Elements found:', {
        socialContainer: !!socialContainer,
        createPostBtn: !!createPostBtn,
        postsMenuBar: !!document.getElementById('postsMenuBar'),
        closeSocialBtn: !!closeSocialBtn
    });

    // Close Social Feed
    if (closeSocialBtn) {
        closeSocialBtn.addEventListener('click', () => {
            console.log('ðŸ”´ Close button clicked');
            if (socialContainer) {
                socialContainer.classList.remove('active');
                console.log('ðŸ”´ socialContainer hidden');

                // Re-open hamburger menu
                const menu = document.getElementById('userHamburgerMenu');
                if (menu) menu.classList.add('open');
                const btn = document.getElementById('userHamburgerBtn');
                if (btn) btn.classList.add('active');
            }
        });
        console.log('ðŸŸ¢ Click listener added to closeSocialBtn');
    }

    // Open Social Container when Posts icon clicked
    const postsMenuBar = document.getElementById('postsMenuBar');
    if (postsMenuBar) {
        postsMenuBar.addEventListener('click', () => {
            console.log('ðŸŸ¢ Posts menu bar clicked!');
            openSocialFeed();
        });
        console.log('ðŸŸ¢ Click listener added to postsMenuBar');
    }

    // Create Post Button
    if (createPostBtn) {
        createPostBtn.addEventListener('click', () => {
            console.log('ðŸ”µ Create Post button clicked');
            openCreatePostModal();
        });
        console.log('ðŸŸ¢ Click listener added to createPostBtn');
    }

    // Refresh Button
    const refreshPostsBtn = document.getElementById('refreshPostsBtn');
    if (refreshPostsBtn) {
        refreshPostsBtn.addEventListener('click', () => {
            console.log('ðŸ”„ Refresh button clicked');
            const icon = refreshPostsBtn.querySelector('i');
            if (icon) icon.classList.add('fa-spin');
            loadFrostedPosts(PostsState.currentView === 'feed' ? 'featured' : 'user');
            setTimeout(() => icon?.classList.remove('fa-spin'), 1000);
        });
    }

    // Modal Handlers
    setupModalHandlers();

    // Tab Switching
    setupTabSwitching();

    // Create Post Handlers
    setupCreatePostHandlers();

    // Load initial posts
    loadFrostedPosts('featured');
}

// Open Social Feed
function openSocialFeed() {
    console.log('ðŸ”µ openSocialFeed called');
    const social = document.getElementById('socialContainer');
    console.log('ðŸ”µ socialContainer element:', social);

    if (social) {
        // Close hamburger menu
        const hamburgerMenu = document.getElementById('userHamburgerMenu');
        if (hamburgerMenu) {
            hamburgerMenu.classList.remove('open');
        }

        // Hide other windows
        document.querySelectorAll('.window, .dm-window, .profile-tray').forEach(w => {
            if (w.classList.contains('active')) w.classList.remove('active');
        });

        social.classList.add('active');
        console.log('ðŸ”µ Added active class to socialContainer');
        loadFrostedPosts(PostsState.currentView === 'feed' ? 'featured' : 'user');
    } else {
        console.error('âŒ socialContainer element not found!');
    }
}

// Setup Modal Handlers
function setupModalHandlers() {
    // Create Post Modal
    const closeCreateModal = document.getElementById('closeCreateModal');
    const cancelCreatePost = document.getElementById('cancelCreatePost');
    const createPostModal = document.getElementById('createPostModal');

    if (closeCreateModal) {
        closeCreateModal.addEventListener('click', () => {
            createPostModal.classList.remove('active');
            resetCreatePostForm();
        });
    }

    if (cancelCreatePost) {
        cancelCreatePost.addEventListener('click', () => {
            createPostModal.classList.remove('active');
            resetCreatePostForm();
        });
    }

    // Comments Modal
    const closeCommentsModal = document.getElementById('closeCommentsModal');
    const commentsModal = document.getElementById('commentsModal');

    if (closeCommentsModal) {
        closeCommentsModal.addEventListener('click', () => {
            commentsModal.classList.remove('active');
            PostsState.currentPostId = null;
        });
    }

    // Click outside to close
    [createPostModal, commentsModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    if (modal === createPostModal) resetCreatePostForm();
                    if (modal === commentsModal) PostsState.currentPostId = null;
                }
            });
        }
    });
}

// Setup Tab Switching
function setupTabSwitching() {
    const feedTab = document.getElementById('feedTab');
    const myPostsTab = document.getElementById('myPostsTab');

    if (feedTab) {
        feedTab.addEventListener('click', () => {
            PostsState.currentView = 'feed';
            updateTabActiveState();
            loadFrostedPosts('featured');
        });
    }

    if (myPostsTab) {
        myPostsTab.addEventListener('click', () => {
            PostsState.currentView = 'my-posts';
            updateTabActiveState();
            loadFrostedPosts('user');
        });
    }
}

function updateTabActiveState() {
    document.querySelectorAll('.tab-item').forEach(tab => tab.classList.remove('active'));
    if (PostsState.currentView === 'feed') {
        document.getElementById('feedTab')?.classList.add('active');
    } else {
        document.getElementById('myPostsTab')?.classList.add('active');
    }
}

// Setup Create Post Handlers
function setupCreatePostHandlers() {
    const imageUploadBtn = document.getElementById('imageUploadBtn');
    const postImageInput = document.getElementById('postImageInput');
    const removeImageBtn = document.getElementById('removeImageBtn');
    const publishPostBtn = document.getElementById('publishPostBtn');

    if (imageUploadBtn && postImageInput) {
        imageUploadBtn.addEventListener('click', () => postImageInput.click());
        postImageInput.addEventListener('change', handleFrostImageUpload);
    }

    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', removeFrostImage);
    }

    if (publishPostBtn) {
        publishPostBtn.addEventListener('click', publishFrostPost);
    }
}

// Open Create Post Modal
function openCreatePostModal() {
    console.log('ðŸ”µ openCreatePostModal called');
    const modal = document.getElementById('createPostModal');
    console.log('ðŸ”µ Modal element:', modal);
    if (modal) {
        modal.classList.add('active');
        console.log('ðŸ”µ Added active class to modal, z-index should be 20000');
        document.getElementById('postTextarea')?.focus();
    } else {
        console.error('âŒ Create Post Modal not found!');
    }
}

// Handle Image Upload
function handleFrostImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        PostsState.selectedImage = event.target.result;
        const preview = document.getElementById('imagePreview');
        const container = document.getElementById('imagePreviewContainer');
        if (preview && container) {
            preview.src = event.target.result;
            container.style.display = 'block';
        }
    };
    reader.readAsDataURL(file);
}

// Remove Image
function removeFrostImage() {
    PostsState.selectedImage = null;
    const container = document.getElementById('imagePreviewContainer');
    const input = document.getElementById('postImageInput');
    if (container) container.style.display = 'none';
    if (input) input.value = '';
}

// Reset Create Post Form
function resetCreatePostForm() {
    const textarea = document.getElementById('postTextarea');
    if (textarea) textarea.value = '';
    removeFrostImage();
}

// Publish Post
function publishFrostPost() {
    const textarea = document.getElementById('postTextarea');
    const content = textarea?.value.trim();

    if (!content && !PostsState.selectedImage) {
        alert('Please add some content or an image');
        return;
    }

    const postData = {
        content: content,
        image: PostsState.selectedImage,
        id: Date.now() + '-' + Math.random().toString(36).substr(2, 9)
    };

    console.log('📤 Publishing post via socket:', postData);

    // Emit to server
    socket.emit('create-post', postData);

    // Close modal and reset
    document.getElementById('createPostModal').classList.remove('active');
    resetCreatePostForm();
}

// Load Posts
function loadFrostedPosts(type) {
    console.log('❄️ loadFrostedPosts called with type:', type);

    // Request posts from server via socket
    socket.emit('get-posts', { type: type });
}

// Render Posts
function renderFrostedPosts(posts) {
    console.log('❄️ renderFrostedPosts called with:', posts ? posts.length : 'null', 'posts');
    const grid = document.getElementById('postsGrid');
    const emptyState = document.getElementById('emptyState');

    if (!grid) return;

    // Clear existing posts
    grid.innerHTML = '';

    if (!posts || posts.length === 0) {
        grid.appendChild(emptyState);
        return;
    }

    posts.forEach(post => {
        grid.appendChild(createFrostPostCard(post));
    });
}

// Create Post Card
function createFrostPostCard(post) {
    const card = document.createElement('div');
    card.className = 'frost-card';
    card.setAttribute('data-post-id', post.id);

    const timestamp = formatFrostTime(post.timestamp);
    const initials = post.username ? post.username.substring(0, 2).toUpperCase() : 'US';

    card.innerHTML = `
        <div class="post-header">
            <div class="post-avatar">${initials}</div>
            <div class="post-header-info">
                <div class="post-username" data-user-id="${post.userId}">${post.username || 'User'}</div>
                <div class="post-timestamp">${timestamp}</div>
            </div>
        </div>
        ${post.content ? `<div class="post-text">${escapeHtml(post.content)}</div>` : ''}
        ${post.imageUrl ? `
            <div class="post-image-wrapper">
                <img class="post-image" src="${post.imageUrl}" alt="Post image">
            </div>
        ` : ''}
        <div class="post-actions">
            <button class="frost-action-btn like-btn" data-post-id="${post.id}">
                <i class="fas fa-heart"></i>
                <span>${post.likes || 0}</span>
            </button>
            <button class="frost-action-btn comment-btn" data-post-id="${post.id}">
                <i class="fas fa-comment"></i>
                <span>${post.commentCount || 0}</span>
            </button>
            ${post.userId === window.currentUserId ? `
                <button class="frost-action-btn delete-btn" data-post-id="${post.id}" style="margin-left: auto; color: rgba(255, 0, 110, 0.7);">
                    <i class="fas fa-trash"></i>
                </button>
            ` : ''}
        </div>
    `;

    // Event Listeners
    const likeBtn = card.querySelector('.like-btn');
    const commentBtn = card.querySelector('.comment-btn');
    const deleteBtn = card.querySelector('.delete-btn');
    const usernameEl = card.querySelector('.post-username');

    if (likeBtn) {
        likeBtn.addEventListener('click', () => toggleFrostLike(post.id));
    }

    if (commentBtn) {
        commentBtn.addEventListener('click', () => openFrostComments(post));
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deleteFrostPost(post.id));
    }

    if (usernameEl) {
        usernameEl.addEventListener('click', () => {
            if (typeof showUserProfile === 'function') {
                showUserProfile(post.userId);
            }
        });
    }

    return card;
}

// Toggle Like
function toggleFrostLike(postId) {
    console.log('❤️ Toggling like for post:', postId);
    socket.emit('toggle-post-like', { postId });
}

// Open Comments
function openFrostComments(post) {
    PostsState.currentPostId = post.id;
    const modal = document.getElementById('commentsModal');
    const originalPostDisplay = document.getElementById('originalPostDisplay');

    if (!modal || !originalPostDisplay) return;

    // Display original post
    const initials = post.username ? post.username.substring(0, 2).toUpperCase() : 'US';
    originalPostDisplay.innerHTML = `
        <div class="post-header">
            <div class="post-avatar">${initials}</div>
            <div class="post-header-info">
                <div class="post-username">${post.username || 'User'}</div>
            </div>
        </div>
        ${post.content ? `<div class="post-text">${escapeHtml(post.content)}</div>` : ''}
    `;

    modal.classList.add('active');

    // Load comments
    socket.emit('get-post-comments', { postId: post.id });
}

// Render Comments
function renderFrostComments(comments) {
    const list = document.getElementById('commentsList');
    if (!list) return;

    list.innerHTML = '';

    if (!comments || comments.length === 0) {
        list.innerHTML = `
            <div class="empty-state" style="padding: 40px 20px;">
                <i class="fas fa-comment-slash"></i>
                <p>No comments yet</p>
            </div>
        `;
        return;
    }

    comments.forEach(comment => {
        const commentEl = document.createElement('div');
        commentEl.style.cssText = 'padding: 12px; background: rgba(255, 255, 255, 0.03); border-radius: 10px; margin-bottom: 10px;';
        const initials = comment.username ? comment.username.substring(0, 2).toUpperCase() : 'US';

        commentEl.innerHTML = `
            <div style="display: flex; gap: 10px; margin-bottom: 8px;">
                <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #b0b0b0, #fff); display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; color: #000;">${initials}</div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #fff; font-size: 0.9rem;">${comment.username || 'User'}</div>
                    <div style="font-size: 0.75rem; color: #b0b0b0;">${formatFrostTime(comment.timestamp)}</div>
                </div>
            </div>
            <div style="color: rgba(255, 255, 255, 0.9); font-size: 0.95rem; padding-left: 42px;">${escapeHtml(comment.content)}</div>
        `;

        list.appendChild(commentEl);
    });
}

// Send Comment
function sendFrostComment() {
    const textarea = document.getElementById('commentTextarea');
    const content = textarea?.value.trim();

    if (!content || !PostsState.currentPostId) return;

    console.log('💬 Sending comment:', content);

    socket.emit('add-comment', {
        postId: PostsState.currentPostId,
        content: content,
        id: Date.now() + '-' + Math.random().toString(36).substr(2, 9)
    });

    textarea.value = '';
}

// Delete Post
function deleteFrostPost(postId) {
    if (confirm('Are you sure you want to delete this post?')) {
        socket.emit('delete-post', { postId });
    }
}

// Utility: Format Time
function formatFrostTime(timestamp) {
    const now = new Date();
    const postTime = new Date(timestamp);
    const diffMs = now - postTime;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return postTime.toLocaleDateString();
}

// Utility: Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ================= SOCKET EVENTS =================

// Posts loaded
// Posts loaded (Server emits 'posts-list' with array)
socket.on('posts-list', function (posts) {
    console.log('❄️ Socket: posts-list received', posts);
    if (posts) {
        renderFrostedPosts(posts);
    } else {
        console.error('❄️ Socket: posts-list received null or undefined');
    }
});

// Post created
socket.on('post-created', function (data) {
    console.log('ðŸ“¨ Socket: post-created received', data);
    if (PostsState.currentView === 'feed' || data.userId === window.currentUserId) {
        console.log('ðŸ“¨ Reloading posts...');
        loadFrostedPosts(PostsState.currentView === 'feed' ? 'featured' : 'user');
    }
});

// Post deleted
socket.on('post-deleted', function (data) {
    const card = document.querySelector(`[data-post-id="${data.postId}"]`);
    if (card) {
        card.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => card.remove(), 300);
    }
});

// Like updated
socket.on('post-like-updated', function (data) {
    const likeBtn = document.querySelector(`[data-post-id="${data.postId}"] .like-btn`);
    if (likeBtn) {
        const span = likeBtn.querySelector('span');
        if (span) span.textContent = data.likes;

        if (data.liked) {
            likeBtn.classList.add('liked');
        } else {
            likeBtn.classList.remove('liked');
        }
    }
});

// Comments loaded
// Comments loaded (Server emits 'post-comments' with { postId, comments })
socket.on('post-comments', function (data) {
    if (data && data.comments) {
        renderFrostComments(data.comments);
    }
});

// Comment added
socket.on('comment-added', function (data) {
    if (PostsState.currentPostId === data.postId) {
        socket.emit('get-post-comments', { postId: data.postId });
    }

    // Update comment count
    const commentBtn = document.querySelector(`[data-post-id="${data.postId}"] .comment-btn span`);
    if (commentBtn) {
        const current = parseInt(commentBtn.textContent) || 0;
        commentBtn.textContent = current + 1;
    }
});

// Post creation acknowledgement (Debug)
socket.on('post-creation-ack', function (data) {
    console.log('❄️ Socket: post-creation-ack received', data);
    if (!data.success) {
        alert('Post failed: ' + (data.error || 'Unknown error'));
    } else {
        console.log('✅ Post created successfully!');
    }
});

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function () {
    initializeFrostedPosts();

    // Send Comment Button
    const sendCommentBtn = document.getElementById('sendCommentBtn');
    if (sendCommentBtn) {
        sendCommentBtn.addEventListener('click', sendFrostComment);
    }

    // Enter to send comment
    const commentTextarea = document.getElementById('commentTextarea');
    if (commentTextarea) {
        commentTextarea.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendFrostComment();
            }
        });
    }
});

