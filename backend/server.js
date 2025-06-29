
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;
const usersFilePath = path.join(__dirname, 'users.json');
const ADMIN_USERNAME = 'frankuleiz';

app.use(cors({
  origin: 'https://derivlite.vercel.app',
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-request-user'],
  credentials: true
}));

app.use(express.json());

async function readUsers() {
    try {
        const data = await fs.readFile(usersFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('users.json not found, returning empty array.');
            return [];
        }
        console.error('Error reading users file:', error);
        throw new Error('Could not read user data.');
    }
}

async function writeUsers(users) {
    try {
        await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), 'utf8');
    } catch (error) {
        console.error('Error writing users file:', error);
        throw new Error('Could not save user data.');
    }
}

function isAdmin(req, res, next) {
    const requestUser = req.headers['x-request-user'] || req.body.requestUser;
    if (requestUser === ADMIN_USERNAME) {
        next();
    } else {
        console.warn(`Unauthorized attempt by user: ${requestUser || 'Unknown'}`);
        res.status(403).json({ message: 'Forbidden: Admin access required.' });
    }
}

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        const users = await readUsers();
        const existingUser = users.find(u => u.username === username);
        if (existingUser) {
            return res.status(409).json({ success: false, message: "User already exists" });
        }

        const newUser = { username, password };
        users.push(newUser);
        await writeUsers(users);

        res.status(201).json({ success: true, message: "User registered successfully" });
    } catch (error) {
        console.error("Error in /api/register:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const users = await readUsers();
        const user = users.find(u => u.username === username && u.password === password);

        if (user) {
            res.json({ success: true, message: "Login successful" });
        } else {
            res.status(401).json({ success: false, message: "Invalid credentials" });
        }
    } catch (error) {
        console.error("Error in /api/login:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

app.get('/api/users', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Received GET /api/users`);
    try {
        const users = await readUsers();
        res.json(users);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in GET /api/users:`, error);
        res.status(500).json({ message: error.message || 'Failed to read user data.' });
    }
});

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
        res.status(500).json({ message: error.message || 'Failed to add user.' });
    }
});

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
        res.status(500).json({ message: error.message || 'Failed to delete user.' });
    }
});

console.log(`Serving static files from root: ${__dirname}`);
app.use(express.static(path.join(__dirname)));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/tools', express.static(path.join(__dirname, 'tools')));

app.use('/api/*', (req, res) => {
    console.log(`[${new Date().toISOString()}] 404 Not Found for API route: ${req.originalUrl}`);
    res.status(404).json({ message: `API endpoint not found: ${req.originalUrl}` });
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    console.log('Serving static files from:', __dirname);
    console.warn('--- SECURITY WARNING ---');
    console.warn('The current authentication check (isAdmin) is NOT secure and only for demonstration.');
    console.warn('Do NOT use this server setup in a production environment without proper authentication.');
    console.warn('------------------------');
});