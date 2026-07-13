const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');

const app = express();
app.use(express.json());

// DEBUGGING: I-check kung may API Key (Gumamit ng .trim() para tanggalin ang hidden spaces)
const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
console.log("--- STARTUP CHECK ---");
console.log("GEMINI_API_KEY is set and clean:", apiKey !== "");

const genAI = new GoogleGenerativeAI(apiKey);

app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === 'alexa_secret_code') {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

app.post('/webhook', async (req, res) => {
    try {
        const entry = req.body.entry ? req.body.entry[0] : null;
        
        if (entry && entry.messaging) {
            const messaging = entry.messaging[0];
            const senderId = messaging.sender.id;
            
            if (messaging.message && messaging.message.text) {
                const userMessage = messaging.message.text;

                // Gamitin ang main version na 'gemini-1.5-flash'
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                
                const result = await model.generateContent(`Ikaw si Alexa, assistant ng Lapida HUB. Sagutin ito: ${userMessage}`);
                const aiResponse = result.response.text();

                await axios.post(`https://graph.facebook.com/v25.0/me/messages`, {
                    recipient: { id: senderId },
                    message: { text: aiResponse }
                }, {
                    params: { access_token: process.env.PAGE_ACCESS_TOKEN }
                });
            }
        }
        res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
        // I-print ang buong error object para makita ang API detail
        console.error('Error sa POST webhook:', error.message);
        res.status(200).send('EVENT_RECEIVED');
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bot is running on port ${PORT}`);
});
