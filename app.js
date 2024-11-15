const express = require('express');
const path = require('path');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to serve static files
app.use(express.static(path.join(__dirname)));
app.use(bodyParser.json()); // Parse JSON bodies

// Proxy route for chat API
app.post('/chat', async (req, res) => {
    console.log('Chat endpoint hit with message:', req.body);
    const apiKey = '8527a3fdd9e44921b07200be713052f0'; // Replace with your actual API key

    try {
        const response = await axios.post('https://api.chai-research.com/v1/chat/completions', {
            model: 'chai_v1',
            messages: req.body.messages,
            max_tokens: 500,
            temperature: 1
        }, {
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            }
        });

        console.log('Received response from Chai API:', response.data);
        res.json(response.data); // Send response back to the client
    } catch (error) {
        console.error('Error communicating with Chai API:', error.response?.data || error.message || error);
        res.status(500).send('Error communicating with Chai API');
    }
});


// Route for the homepage
app.get('/', (req, res) => {
    console.log('Homepage requested');
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
