const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;
const ADMIN_USERNAME = 'frankuleiz';

// === MongoDB Connection ===
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://admin:9uP83iLCo97iliqR@derivlite.gmcal7d.mongodb.net/?retryWrites=true&w=majority&appName=derivlite')
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// === User Schema ===
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  uniqueId: { type: String, required: true },
  source: { type: String, default: 'web_app' },
  createdBy: { type: String, default: 'non_authenticated_user_blueprint26_live' },
  createdDate: { type: Date, required: true },
  modifiedDate: { type: Date, default: () => new Date() },
  active: { type: Boolean, default: true },
  role: { type: String, default: 'user' }
});

const User = mongoose.model('User', UserSchema);

// === Middleware ===
app.use(cors({
  origin: 'https://derivlite.vercel.app',
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-request-user'],
  credentials: true
}));
app.use(express.json());

// === Admin Middleware ===
function isAdmin(req, res, next) {
  const requestUser = req.headers['x-request-user'] || req.body.requestUser;
  if (requestUser === ADMIN_USERNAME) {
    return next();
  }
  console.warn(`Unauthorized admin attempt by user: ${requestUser}`);
  return res.status(403).json({ message: 'Forbidden: Admin access required.' });
}

// === Routes ===

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
      const users = await User.find().limit(5); // get first 5 users
      res.json({
          message: '✅ Database connection works',
          userSample: users
      });
  } catch (err) {
      console.error('❌ Test DB query failed:', err);
      res.status(500).json({ message: 'Database test failed', error: err.message });
  }
});

// Register new user
app.post('/api/register', async (req, res) => {
  const {
    username,
    email,
    password,
    unique_id,
    registration_source,
    registration_time
  } = req.body;

  if (!username || !email || !password || !unique_id || !registration_time) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(409).json({ message: 'Username or email already exists' });
    }

    const newUser = new User({
      username,
      password,
      email,
      uniqueId: unique_id, // match schema
      source: registration_source || 'web_app',
      createdBy: 'non_authenticated_user_blueprint26_live',
      createdDate: new Date(registration_time), // match schema
      modifiedDate: new Date(),
      role: username === 'frankuleiz' ? 'admin' : 'user'
    });
    
    await newUser.save();

    return res.status(201).json({
      success: true,
      user: {
        username: newUser.username,
        email: newUser.email,
        uniqueId: newUser.uniqueId,
        createdDate: newUser.createdDate,
        source: newUser.source,
        role: newUser.role
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username, password });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    return res.json({
      success: true,
      message: 'Login successful',
      user: {
        username: user.username,
        email: user.email,
        role: user.role,
        active: user.active
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// Get all users (admin only)
app.get('/api/users', isAdmin, async (req, res) => {
  try {
    const users = await User.find({}, 'username email role active createdDate');
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Add new user (admin only)
app.post('/api/users', isAdmin, async (req, res) => {
  const { username, password, email, uniqueId } = req.body;

  if (!username || !password || !email || !uniqueId) {
    return res.status(400).json({ message: 'All fields required' });
  }

  try {
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(409).json({ message: 'Username or email already exists' });
    }

    const newUser = new User({
      username,
      password,
      email,
      uniqueId,
      createdDate: new Date(),
      role: username === ADMIN_USERNAME ? 'admin' : 'user'
    });

    await newUser.save();
    res.status(201).json({ message: 'User created', user: newUser });
  } catch (err) {
    console.error('Error adding user:', err);
    res.status(500).json({ message: 'Server error creating user' });
  }
});

// Delete user by username (admin only)
app.delete('/api/users/:username', isAdmin, async (req, res) => {
  const { username } = req.params;
  if (username === ADMIN_USERNAME) {
    return res.status(400).json({ message: 'Cannot delete main admin' });
  }

  try {
    const result = await User.deleteOne({ username });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: `User "${username}" not found.` });
    }
    res.json({ message: `User "${username}" deleted successfully.` });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'Server error deleting user' });
  }
});

// Serve frontend
console.log(`Serving static files from root: ${__dirname}`);
app.use(express.static(path.join(__dirname)));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/tools', express.static(path.join(__dirname, 'tools')));

// Catch unknown API routes
app.use('/api/*', (req, res) => {
  console.log(`[${new Date().toISOString()}] 404 Not Found for API route: ${req.originalUrl}`);
  res.status(404).json({ message: `API endpoint not found: ${req.originalUrl}` });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
  console.log('📂 Static files served from:', __dirname);
  console.warn('--- SECURITY WARNING ---');
  console.warn('The current admin check is not secure. Use proper auth in production.');
  console.warn('------------------------');
});
