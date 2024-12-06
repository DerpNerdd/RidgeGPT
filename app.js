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
  res.render('register', { error: {} }); // Pass an empty error object
});
app.post('/register', async (req, res) => {
  const { email, username, password } = req.body;
  const errors = {};
  
  try {
    if (await User.findOne({ email })) {
      errors.email = 'Email already registered';
    }
    if (await User.findOne({ username })) {
      errors.username = 'Username already taken';
    }

    if (Object.keys(errors).length > 0) {
      return res.render('register', { error: errors });
    }

    const user = new User({ email, username, password });
    await user.save();
    req.session.userId = user._id;
    req.session.username = user.username;
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.render('register', { error: { general: 'An error occurred during registration' } });
  }
});


// Login Routes
app.get('/login', (req, res) => {
  res.render('login', { error: {} }); // Pass an empty error object
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const errors = {};

  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      errors.general = 'Incorrect email or password';
      return res.render('login', { error: errors });
    }

    req.session.userId = user._id;
    req.session.username = user.username;
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.render('login', { error: { general: 'An error occurred during login' } });
  }
});


// Logout Route
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.post('/api/chat', authMiddleware, async (req, res) => {
  console.log('Chat endpoint hit with data:', req.body);

  try {
      const { chatId, message, model } = req.body;

      if (!chatId) {
          return res.status(400).json({ error: 'No chat ID provided. Please provide a chat ID.' });
      }

      // Use the model parameter, default to 'gpt-4' if not provided
      const selectedModel = model || 'gpt-4';

      // Find the chat associated with the user
      const chat = await Chat.findOne({ _id: chatId, user: req.session.userId });

      if (!chat) {
          return res.status(404).json({ error: 'Chat not found.' });
      }

      // Append the new user message to the chat
      const userMessage = { role: 'user', content: message };
      chat.messages.push(userMessage);

      await chat.save();

      // Prepare messages for the API call
      const messages = chat.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
      }));

      messages.unshift({
        role: 'system',
        content: `
      You are a highly capable, context-aware, and dynamic virtual assistant. You will respond to the user with a lively and engaging persona, striking a balance between friendliness, professionalism, and warmth. Use the following guiding principles when generating responses:
      
      1. **Tone and Style:**
         - Maintain a generally positive, encouraging, and welcoming demeanor. 
         - Write with clarity, but do so in a personable, relatable voice—imagine speaking directly to an interested, curious user. 
         - Integrate subtle expressions of empathy and humor where appropriate, but do not become flippant or unserious.
         - Vary sentence length and structure, and avoid overly repetitive phrasing to keep the reading experience natural and dynamic.
         
      2. **Level of Detail and Depth:**
         - Strive to provide thorough and thoughtful answers. When a user asks a question, do more than simply state facts: explain the reasoning, underlying concepts, context, and implications.
         - When dealing with complex topics, break them down into manageable parts, offering clear definitions, relevant examples, and relatable analogies.
         - If the user’s query is ambiguous or incomplete, clarify and ask gently probing questions to better understand their needs, rather than giving a generic or vague reply.
         - Avoid excessive brevity. While concise answers can be acceptable for simple questions, generally aim to include helpful background information and context. Offer a well-rounded understanding rather than just the bare minimum.
         
      3. **User Engagement:**
         - Greet the user or acknowledge their question in some subtle, natural way. This doesn’t always have to be explicit (“Hello!”) but can be integrated into your first sentence so the user feels heard and engaged.
         - If the user’s request involves processes, instructions, or multi-step reasoning, present the information in a logical sequence. Consider enumerated lists, bullet points, or short paragraphs that build upon one another.
         - Whenever possible and appropriate, offer examples or small narrative scenarios. For instance, if the user asks about a concept, illustrate it with a short example. If they ask “how” or “why,” show them a real or hypothetical scenario to bring the explanation to life.
         
      4. **Accuracy and Trustworthiness:**
         - Uphold factual accuracy and correctness. If you are uncertain about a detail, either verify it logically or express uncertainty. However, avoid ending on uncertainty—offer what you do know and suggest possible next steps for clarification.
         - Remain aligned with the user’s context. If they provided information earlier, refer back to it. Show that you remember and integrate previous details from the conversation.
         - If the user’s request involves code or technical examples, present them cleanly and clearly. Be ready to highlight key parts and explain the reasoning behind each step. Keep code blocks properly formatted and, if relevant, reference the language or environment they asked about.
      
      5. **Versatility and Adaptability:**
         - Adjust complexity based on cues from the user’s style and previous queries. If the user seems more advanced, go deeper into technicalities; if they seem less experienced, offer more guidance and fewer assumptions.
         - If the user expresses frustration, confusion, or any particular emotion, respond empathetically. For instance, acknowledge their feelings and then provide the best guidance or reassurance possible.
         - For follow-up questions, build upon what has already been discussed. Show continuity and coherence, referencing earlier points you made to create a sense of narrative flow and ongoing understanding.
      
      6. **Proactive Assistance:**
         - Anticipate related questions the user might have and consider addressing them preemptively or at least hinting at additional directions they can explore.
         - If there are common misunderstandings related to the topic, consider clarifying them.
         - Where helpful, provide suggestions for next steps, further resources, or considerations the user might find valuable.
      
      By following these principles, you will produce responses that are not only correct and helpful but also more lively, personable, and context-rich, giving the user a truly engaging and informative conversation experience.
      `
      });
      

      // let temperature = 0.7;
      // if (selectedModel === 'o1-preview' || selectedModel === 'o1-mini') {
      //     temperature = 1; 
      // }

      // Send the conversation to OpenAI API
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: selectedModel,
        messages: messages,
        temperature: 0.7,
    }, {
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
        },
    });

      
      console.log('Received response from OpenAI API:', response.data);

      const assistantMessage = response.data.choices[0].message;

      // Append the assistant's message to the chat
      chat.messages.push(assistantMessage);
      await chat.save();

      let chatTitle = chat.title;

      // If the chat doesn't have a title yet, generate one
      if (!chatTitle) {
          // Generate chat title using OpenAI
          const titleResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
              model: selectedModel, // Use the selected model
              messages: [
                  {
                      role: 'system',
                      content: 'You are an assistant that generates extremely concise, simple, and descriptive titles for conversations. Provide a title of 2 to 4 words that best represents the following conversation. Do not include any preamble, labels, or extra text—just provide the title itself without quotation marks or punctuation.'
                  },
                  {
                      role: 'user',
                      content: chat.messages.map(msg => msg.content).join('\n')
                  },
              ],
              temperature: 0.5,
              max_tokens: 5,
          }, {
              headers: {
                  'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                  'Content-Type': 'application/json',
              },
          });

          let titleMessage = titleResponse.data.choices[0].message.content.trim();

          // Remove leading/trailing quotation marks and any "Title:" prefix
          titleMessage = titleMessage.replace(/^["']|["']$/g, '').replace(/^[Tt]itle\s*[:\-–—]?\s*/, '');

          chat.title = titleMessage;
          await chat.save();

          chatTitle = titleMessage;
      }

      // Encode the assistant's message content before sending to client
      const encodedAssistantMessage = {
          role: assistantMessage.role,
          content: Buffer.from(assistantMessage.content, 'utf8').toString('base64'),
      };

      res.json({ success: true, message: encodedAssistantMessage, title: chatTitle });
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

    // Create a copy of the chat to avoid mutating the original
    const chatCopy = JSON.parse(JSON.stringify(chat));

    // Encode the message content using Base64
    chatCopy.messages.forEach((message) => {
      message.content = Buffer.from(message.content, 'utf8').toString('base64');
    });

    res.json({ success: true, chat: chatCopy });
  } catch (err) {
    console.error('Error fetching chat:', err);
    res.status(500).json({ error: 'An error occurred while fetching the chat.' });
  }
});


app.delete('/api/chats/:id', authMiddleware, async (req, res) => {
  try {
      const chatId = req.params.id;

      const result = await Chat.deleteOne({ _id: chatId, user: req.session.userId });

      if (result.deletedCount === 0) {
          return res.status(404).json({ error: 'Chat not found.' });
      }

      res.json({ success: true });
  } catch (err) {
      console.error('Error deleting chat:', err);
      res.status(500).json({ error: 'An error occurred while deleting the chat.' });
  }
});

app.post('/api/chats/:id/rename', authMiddleware, async (req, res) => {
  try {
      const chatId = req.params.id;
      const { title } = req.body;

      const chat = await Chat.findOneAndUpdate(
          { _id: chatId, user: req.session.userId },
          { title: title },
          { new: true }
      );

      if (!chat) {
          return res.status(404).json({ error: 'Chat not found.' });
      }

      res.json({ success: true, chat });
  } catch (err) {
      console.error('Error renaming chat:', err);
      res.status(500).json({ error: 'An error occurred while renaming the chat.' });
  }
});

app.post('/api/chats/:id/setmodel', authMiddleware, async (req, res) => {
  try {
    const chatId = req.params.id;
    const { model } = req.body;

    const chat = await Chat.findOneAndUpdate(
      { _id: chatId, user: req.session.userId },
      { model: model },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found.' });
    }

    res.json({ success: true, chat });
  } catch (err) {
    console.error('Error updating chat model:', err);
    res.status(500).json({ error: 'An error occurred while updating the chat model.' });
  }
});


// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
