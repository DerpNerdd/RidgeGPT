const express = require('express');
const path = require('path');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to serve static files
app.use(express.static(path.join(__dirname)));
app.use(bodyParser.json()); // Parse JSON bodies

const apiKey = "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"

// Route for homepage
app.get('/', (req, res) => {
    console.log('Homepage requested');
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Proxy route for ChatGPT API
app.post('/api/chat', async (req, res) => {
    console.log('Chat endpoint hit with data:', req.body);

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4o', // Change model as needed
            messages: req.body.messages,
            max_tokens: 1000,
            temperature: 1
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Received response from OpenAI API:', response.data);
        res.json(response.data);
    } catch (error) {
        // Log detailed errors for troubleshooting
        console.error('Error communicating with OpenAI API:', error.response ? error.response.data : error.message);
        res.status(500).send('Error communicating with OpenAI API: ' + (error.response ? JSON.stringify(error.response.data) : error.message));
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
