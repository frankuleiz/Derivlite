document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const loginPopup = document.getElementById('login-popup');
    const loginTriggerBtn = document.getElementById('login-trigger-btn');
    const modalCloseBtn = document.getElementById('modal-close');
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password'); // Although not used securely
    const loginErrorMessage = document.getElementById('login-error-message');
    const accessPromptSection = document.getElementById('access-prompt-section');
    const toolContentSection = document.getElementById('tool-content-section');
    const logoutBtn = document.getElementById('logout-btn');

    // --- Modal Visibility Functions ---
    function showModal() {
        if (loginPopup) {
            loginErrorMessage.style.display = 'none'; // Hide error on show
            loginPopup.style.display = 'flex';
            setTimeout(() => {
                loginPopup.classList.add('visible');
            }, 10);
        }
    }

    function hideModal() {
        if (loginPopup) {
            loginPopup.classList.remove('visible');
            loginPopup.addEventListener('transitionend', function handler() {
                loginPopup.style.display = 'none';
            }, { once: true });
        }
    }

    // --- UI Update Functions ---
    function showLoginPrompt() {
        if (accessPromptSection) accessPromptSection.style.display = 'flex';
        if (toolContentSection) toolContentSection.style.display = 'none';
    }

    function showToolContent() {
        if (accessPromptSection) accessPromptSection.style.display = 'none';
        if (toolContentSection) toolContentSection.style.display = 'block'; // Or 'flex', etc.
    }

    // --- Login/Logout Logic ---
    function displayLoginError(message) {
        if (loginErrorMessage) {
            loginErrorMessage.textContent = message;
            loginErrorMessage.style.display = 'block';
        }
    }

    async function handleLogin(event) {
        event.preventDefault();
        loginErrorMessage.style.display = 'none';
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
    
        try {
            const response = await fetch('https://derivlite.onrender.com/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
    
            const result = await response.json();
    
            if (!response.ok || !result.success) {
                displayLoginError(result.message || 'Login failed');
                return;
            }
    
            // ✅ Login successful
            sessionStorage.setItem('isUserLoggedIn', 'true');
            sessionStorage.setItem('loggedInUsername', result.user.username);
            sessionStorage.setItem('userRole', result.user.role); // useful for admin logic
            hideModal();
            showToolContent();
            console.log('Login successful for:', result.user.username);
    
        } catch (error) {
            console.error("Login Error:", error);
            displayLoginError('Login failed. Please try again later.');
        }
    }
    
    function handleLogout() {
        sessionStorage.removeItem('isUserLoggedIn');
        sessionStorage.removeItem('loggedInUsername');
        showLoginPrompt(); // Show the login prompt again
        console.log('User logged out.');
        // Optionally redirect to home or login page
        // window.location.href = '../index.html';
    }


    // --- Login Status Check ---
    function checkLoginStatus() {
        const isLoggedIn = sessionStorage.getItem('isUserLoggedIn') === 'true';

        if (isLoggedIn) {
            showToolContent(); // User is logged in, show tools
            console.log("User is already logged in.");
        } else {
            showLoginPrompt(); // User not logged in, ensure prompt is shown
            // Automatically show modal only if explicitly desired on page load
            // showModal(); // Uncomment this line if you want the modal immediately on load when not logged in
        }
    }

    // --- Event Listeners ---
    if (loginTriggerBtn) {
        loginTriggerBtn.addEventListener('click', showModal);
    }
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', hideModal);
    }
    if (loginPopup) {
        loginPopup.addEventListener('click', (event) => {
            if (event.target === loginPopup) hideModal();
        });
    }
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // --- Initial Check on Load ---
    checkLoginStatus();

}); // End DOMContentLoaded
