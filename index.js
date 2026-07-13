const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');

const app = express();
app.use(express.json());

// Log para makita natin kung may pumapasok na request sa Render Logs
app.use((req, res, next) => {
    console.log(`${req.method} request received at ${req.url}`);
    next();
});

// 1. VERIFICATION
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === 'alexa_secret_code') {
        console.log('Webhook verified successfully!');
        res.status(200).send(challenge);
    } else {
        console.log('Webhook verification failed.');
        res.sendStatus(403);
    }
});

// 2. CHATBOT LOGIC
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/webhook', async (req, res) => {
    try {
        const entry = req.body.entry ? req.body.entry[0] : null;
        
        if (entry && entry.messaging) {
            const messaging = entry.messaging[0];
            const senderId = messaging.sender.id;
            const userMessage = messaging.message.text;

            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
            const result = await model.generateContent(`Ikaw si Alexa, assistant ng Lapida HUB. Sagutin ito: ${userMessage}`);
            const aiResponse = await result.response.text();

            await axios.post(`https://graph.facebook.com/v25.0/me/messages`, {
                recipient: { id: senderId },
                message: { text: aiResponse }
            }, {
                params: { access_token: process.env.PAGE_ACCESS_TOKEN }
            });
        }
        res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
        console.error('Error sa POST webhook:', error.message);
        res.status(200).send('EVENT_RECEIVED');
    }
});

// 3. START SERVER (Naka-bind sa 0.0.0.0 para sa Render)
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bot is running on port ${PORT}`);
});
