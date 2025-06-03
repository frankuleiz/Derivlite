const express = require('express');
const fs = require('fs').promises; // Use promise-based fs
const path = require('path');

const app = express();
const port = 3000; // Port the server will listen on
const usersFilePath = path.join(__dirname, 'users.json');
const ADMIN_USERNAME = 'mikemuchiri1943@karatina'; // Define the admin username

// Middleware to parse JSON request bodies
app.use(express.json());

// --- Helper Functions ---
async function readUsers() {
    try {
        const data = await fs.readFile(usersFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist or is invalid, return default or throw error
        if (error.code === 'ENOENT') {
            console.log('users.json not found, returning empty array.');
            return []; // Or return default users if desired
        }
        console.error('Error reading users file:', error);
        throw new Error('Could not read user data.'); // Propagate error
    }
}

async function writeUsers(users) {
    try {
        await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), 'utf8'); // Pretty print JSON
    } catch (error) {
        console.error('Error writing users file:', error);
        throw new Error('Could not save user data.'); // Propagate error
    }
}

// --- Basic Authentication Middleware (VERY INSECURE - FOR DEMO ONLY) ---
// In a real application, use proper authentication (sessions, JWT, etc.)
function isAdmin(req, res, next) {
    // Check for a custom header or a field in the body indicating the requesting user
    // This is easily spoofed! DO NOT USE IN PRODUCTION.
    const requestUser = req.headers['x-request-user'] || req.body.requestUser; // Example check
    if (requestUser === ADMIN_USERNAME) {
        next(); // User is admin, proceed
    } else {
        console.warn(`Unauthorized attempt by user: ${requestUser || 'Unknown'}`);
        res.status(403).json({ message: 'Forbidden: Admin access required.' });
    }
}

// --- API Routes ---

// GET /api/users - Fetch all users
app.get('/api/users', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Received GET /api/users`); // Add logging
    try {
        const users = await readUsers();
        res.json(users);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in GET /api/users:`, error); // Log error details
        res.status(500).json({ message: error.message || 'Failed to read user data.' });
    }
});

// POST /api/users - Add a new user (Admin only)
app.post('/api/users', isAdmin, async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    try {
        const users = await readUsers();

        if (users.some(user => user.username === username)) {
            return res.status(409).json({ message: `Username "${username}" already exists.` });
        }

        const newUser = { username, password };
        if (username === ADMIN_USERNAME && !users.some(u => u.role === 'admin')) {
             newUser.role = 'admin';
        }

        users.push(newUser);
        await writeUsers(users);
        console.log(`User added: ${username}`);
        res.status(201).json(newUser);

    } catch (error) {
         // Ensure JSON error response
        res.status(500).json({ message: error.message || 'Failed to add user.' });
    }
});

// DELETE /api/users/:username - Delete a user (Admin only)
app.delete('/api/users/:username', isAdmin, async (req, res) => {
    const usernameToDelete = req.params.username;

    if (usernameToDelete === ADMIN_USERNAME) {
        return res.status(400).json({ message: 'Cannot delete the main admin user.' });
    }

    try {
        let users = await readUsers();
        const initialLength = users.length;
        users = users.filter(user => user.username !== usernameToDelete);

        if (users.length === initialLength) {
            return res.status(404).json({ message: `User "${usernameToDelete}" not found.` });
        }

        await writeUsers(users);
        console.log(`User deleted: ${usernameToDelete}`);
        res.status(200).json({ message: `User "${usernameToDelete}" deleted successfully.` });

    } catch (error) {
         // Ensure JSON error response
        res.status(500).json({ message: error.message || 'Failed to delete user.' });
    }
});

// --- Serve Static Files ---
// Serve files from the root 'landing' directory and subdirectories
console.log(`Serving static files from root: ${__dirname}`);
app.use(express.static(path.join(__dirname)));
// Serve admin specific files
app.use('/admin', express.static(path.join(__dirname, 'admin')));
// Serve tool specific files
app.use('/tools', express.static(path.join(__dirname, 'tools')));

// --- Catch-all 404 Handler (for API-like paths) ---
// This should be placed *after* all other routes and static middleware
app.use('/api/*', (req, res) => {
    console.log(`[${new Date().toISOString()}] 404 Not Found for API route: ${req.originalUrl}`);
    res.status(404).json({ message: `API endpoint not found: ${req.originalUrl}` });
});

// --- Start Server ---
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    console.log('Serving static files from:', __dirname);
    console.warn('--- SECURITY WARNING ---');
    console.warn('The current authentication check (isAdmin) is NOT secure and only for demonstration.');
    console.warn('Do NOT use this server setup in a production environment without proper authentication.');
    console.warn('------------------------');
});
