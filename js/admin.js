document.addEventListener('DOMContentLoaded', async () => { // Make listener async
    const userTableBody = document.querySelector('#userTable tbody');
    const adminError = document.getElementById('adminError');
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    const allowedAdmins = ['frankuleiz', 'kamunyuz@gmail.com'];
    const BASE_API = 'https://derivlite.onrender.com';

    if (!allowedAdmins.includes(loggedInUser)) {
    // Deny access...
    }


    // --- Security Check (Basic - Client-Side Only) ---
    
    if (loggedInUser !== 'frankuleiz') {
        document.body.innerHTML = `
            <div class="container" style="text-align: center; padding-top: 50px;">
                <h1 style="color: var(--danger-color);">Access Denied</h1>
                <p style="color: var(--muted-text);">You do not have permission to view this page.</p>
                <a href="../tools/index.html" class="btn primary" style="margin-top: 20px;">Back to Tool</a>
            </div>`;
        const style = document.createElement('style');
        style.textContent = `
            body { background: var(--primary-bg); font-family: 'Source Code Pro', monospace; }
            :root { --primary-bg: #0c0d10; --secondary-bg: #151820; --panel-bg: #1a1d25; --text-color: #a5f5d7; --muted-text: #7aa689; --accent-color: #00ff9d; --highlight-color: #00c4ff; --border-color: #2a3040; --danger-color: #ff5252; --warning-color: #ffbc2c; --success-color: #34d399; }
            .container { max-width: 600px; margin: auto; }
            .btn { background: var(--secondary-bg); color: var(--text-color); border: 1px solid var(--border-color); font-family: 'Share Tech Mono', monospace; padding: 8px 15px; cursor: pointer; font-size: 14px; transition: all 0.2s; border-radius: 3px; display: inline-flex; align-items: center; gap: 8px; text-decoration: none; }
            .btn.primary { background: rgba(0, 255, 157, 0.2); border-color: var(--accent-color); color: var(--accent-color); }
            .btn.primary:hover { background: rgba(0, 255, 157, 0.3); box-shadow: 0 0 10px rgba(0, 255, 157, 0.5); }
        `;
        document.head.appendChild(style);
        return; // Stop further execution
    }
    // --- End Security Check ---

    // Fetch users
    async function getUsers() {
    try {
        const response = await fetch(`${BASE_API}/api/users`, {
        headers: {
            'x-request-user': 'frankuleiz'
        }
        });

        if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
        }

        const users = await response.json();
        return users;
    } catch (error) {
        console.error('Error fetching users from API:', error);
        return [];
    }
    }
     
    // Render user table (now read-only)
    async function renderUsers() {
        const users = await getUsers(); // Fetch users asynchronously
        userTableBody.innerHTML = ''; // Clear existing rows

        if (users.length > 0) {
            users.forEach(user => {
                const row = userTableBody.insertRow();
                row.insertCell(0).textContent = user.username;
                row.insertCell(1).textContent = '********'; // Placeholder for password
            });
        }
    }

    // Initial render
    await renderUsers(); // Call the async render function
});
