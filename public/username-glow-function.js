// Apply glow effect to a username element - EXACT COPY of AI text implementation
function applyUsernameGlow(element, username, userColor) {
    if (!element || !username) return;

    const glowColor = getGlowColorForUsername(username);
    if (!glowColor) return;

    // Add the glow class
    element.classList.add('username-glow');

    // Extract RGB from hex color for text-shadow
    const r = parseInt(glowColor.light.slice(1, 3), 16);
    const g = parseInt(glowColor.light.slice(3, 5), 16);
    const b = parseInt(glowColor.light.slice(5, 7), 16);

    // Set color for fallback (exactly like AI text)
    element.style.color = '#1a1a1a';

    // Set text-shadow (exactly like AI text)
    element.style.textShadow = `
        0 0 10px rgba(${r}, ${g}, ${b}, 0.5),
        0 0 20px rgba(${r}, ${g}, ${b}, 0.3),
        0 0 30px rgba(${r}, ${g}, ${b}, 0.2)
    `;

    // Set gradient background (exactly like AI text)
    element.style.background = `linear-gradient(
        135deg,
        #0a0a0a 0%,
        #2a2a2a 25%,
        ${glowColor.light} 50%,
        #2a2a2a 75%,
        #0a0a0a 100%
    )`;

    element.style.backgroundSize = '300% 100%';
    element.style.webkitBackgroundClip = 'text';
    element.style.backgroundClip = 'text';
    element.style.webkitTextFillColor = 'transparent';
}

// Utility function to apply glow to all username elements in a container
function applyGlowToAllUsernames(container = document) {
    // Find all elements with username class or data-username attribute
    const usernameElements = container.querySelectorAll('.username, [data-username-glow]');

    usernameElements.forEach(element => {
        const username = element.textContent.trim() || element.dataset.username;
        const userColor = element.style.color || getComputedStyle(element).color;
        applyUsernameGlow(element, username, userColor);
    });
}
