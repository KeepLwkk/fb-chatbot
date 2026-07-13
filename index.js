const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');

const app = express();
app.use(express.json());

// Verification
app.get('/webhook', (req, res) => {
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === 'alexa_secret_code') {
        res.status(200).send(req.query['hub.challenge']);
    } else {
        res.sendStatus(403);
    }
});

// Chatbot Logic
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/webhook', async (req, res) => {
    try {
        const entry = req.body.entry[0];
        if (entry.messaging) {
            const messaging = entry.messaging[0];
            const senderId = messaging.sender.id;
            const userMessage = messaging.message.text;

            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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
        console.error('Error:', error.message);
        res.status(200).send('EVENT_RECEIVED');
    }
});

app.listen(process.env.PORT || 3000, () => console.log('Bot is running'));
