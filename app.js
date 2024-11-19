// app.js
require('dotenv').config(); // Load environment variables from .env

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const axios = require('axios'); // Ensure axios is installed: npm install axios

// Models
const User = require('./models/User');
const Chat = require('./models/Chat');

// Middleware
const authMiddleware = require('./authMiddleware');

// Initialize Express App
const app = express();

// Set EJS as the templating engine
app.set('view engine', 'ejs');

// Set Views Directory
app.set('views', path.join(__dirname, 'views'));

// Serve Static Files
app.use(express.static(path.join(__dirname, 'public')));

// Body Parser Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Connect to MongoDB using the connection string from the .env file
mongoose.connect(process.env.MONGODB_URI, {})
.then(() => console.log('MongoDB connected'))
.catch((err) => console.error('MongoDB connection error:', err));

// Session Middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_session_secret', // Use SESSION_SECRET from .env
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI, // Use the same MongoDB connection for sessions
  }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 1 day
}));

// Routes

// Home Route (Chat Interface)
app.get('/', authMiddleware, (req, res) => {
  res.render('index', { username: req.session.username });
});

// Registration Routes
app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.render('register', { error: 'Username already exists.' });
    }

    const user = new User({ username, password });
    await user.save();
    req.session.userId = user._id; // Save user ID in session
    req.session.username = user.username; // Save username in session
    res.redirect('/');
  } catch (err) {
    console.error('Registration error:', err);
    res.render('register', { error: 'An error occurred during registration.' });
  }
});

// Login Routes
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (user && await user.comparePassword(password)) {
      req.session.userId = user._id; // Save user ID in session
      req.session.username = user.username; // Save username in session
      res.redirect('/');
    } else {
      res.render('login', { error: 'Invalid username or password.' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.render('login', { error: 'An error occurred during login.' });
  }
});

// Logout Route
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// Proxy route for ChatGPT API
app.post('/api/chat', authMiddleware, async (req, res) => {
  console.log('Chat endpoint hit with data:', req.body);

  try {
    const { chatId, message } = req.body;

    if (!chatId) {
      return res.status(400).json({ error: 'No chat ID provided. Please provide a chat ID.' });
    }

    // Find the chat associated with the user
    const chat = await Chat.findOne({ _id: chatId, user: req.session.userId });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found.' });
    }

    // Append the new user message to the chat
    const userMessage = { role: 'user', content: message };
    chat.messages.push(userMessage);

    // If the chat doesn't have a title yet, set it to the first user message
    if (!chat.title) {
      chat.title = message.substring(0, 100); // Limit title length
    }

    await chat.save();

    // Send the conversation to OpenAI API
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o', 
      messages: chat.messages.map(msg => ({ role: msg.role, content: msg.content })),
      temperature: 0.6,
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, // Use API key from .env
        'Content-Type': 'application/json',
      },
    });

    console.log('Received response from OpenAI API:', response.data);

    const assistantMessage = response.data.choices[0].message;
    // Append the assistant's message to the chat
    chat.messages.push(assistantMessage);
    await chat.save();

    res.json({ success: true, message: assistantMessage });
  } catch (error) {
    // Log detailed errors for troubleshooting
    console.error('Error communicating with OpenAI API:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Error communicating with OpenAI API', details: error.response ? error.response.data : error.message });
  }
});

// API Route for New Chat
app.post('/api/new-chat', authMiddleware, async (req, res) => {
  try {
    // Create a new chat
    const chat = new Chat({
      user: req.session.userId,
      messages: [],
    });
    await chat.save();

    // Return the new chat's ID
    res.json({ success: true, chatId: chat._id });
  } catch (err) {
    console.error('Error creating new chat:', err);
    res.status(500).json({ error: 'An error occurred while creating a new chat.' });
  }
});

// API Route to get list of chats
app.get('/api/chats', authMiddleware, async (req, res) => {
  try {
    const chats = await Chat.find({ user: req.session.userId })
      .sort({ updatedAt: -1 })
      .select('_id title createdAt updatedAt');

    res.json({ success: true, chats });
  } catch (err) {
    console.error('Error fetching chats:', err);
    res.status(500).json({ error: 'An error occurred while fetching chats.' });
  }
});

// API Route to get messages of a chat
app.get('/api/chats/:id', authMiddleware, async (req, res) => {
  try {
    const chatId = req.params.id;
    const chat = await Chat.findOne({ _id: chatId, user: req.session.userId });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found.' });
    }

    res.json({ success: true, chat });
  } catch (err) {
    console.error('Error fetching chat:', err);
    res.status(500).json({ error: 'An error occurred while fetching the chat.' });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
