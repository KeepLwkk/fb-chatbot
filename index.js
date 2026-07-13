const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');

const app = express();
app.use(express.json());

// Log para makita sa Render kung may pumapasok na request
app.use((req, res, next) => {
    console.log(`${req.method} request received at ${req.url}`);
    next();
});

// STARTUP CHECK: Tinitiyak kung may laman ang mga Environment Variables
const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
console.log("--- STARTUP CHECK ---");
console.log("GEMINI_API_KEY is set and clean:", apiKey !== "");
console.log("PAGE_ACCESS_TOKEN is set:", process.env.PAGE_ACCESS_TOKEN ? "YES" : "NO");

const genAI = new GoogleGenerativeAI(apiKey);

// 1. FACEBOOK WEBHOOK VERIFICATION (Para sa Setup)
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

// 2. CHATBOT LOGIC + MODEL DEBUGGING
app.post('/webhook', async (req, res) => {
    try {
        // DEBUGGING: I-list ang mga models na tanggap ng iyong API Key
        try {
            const modelList = await genAI.listModels();
            console.log("MGA MODEL NA PWEDE MONG GAMITIN:", JSON.stringify(modelList.models.map(m => m.name)));
        } catch (listError) {
            console.error("Hindi ma-list ang mga models:", listError.message);
        }

        const entry = req.body.entry ? req.body.entry[0] : null;
        
        if (entry && entry.messaging) {
            const messaging = entry.messaging[0];
            const senderId = messaging.sender.id;
            
            if (messaging.message && messaging.message.text) {
                const userMessage = messaging.message.text;
                console.log(`Mensahi mula sa user (${senderId}):`, userMessage);

                // Dito tinatawag ang Gemini API
                // Palitan ang line na ito sa loob ng iyong app.post:
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const result = await model.generateContent(`Ikaw si Alexa, assistant ng Lapida HUB. Sagutin ito: ${userMessage}`);
                const aiResponse = result.response.text();

                // I-send ang sagot ng AI pabalik sa Facebook Messenger
                await axios.post(`https://graph.facebook.com/v25.0/me/messages`, {
                    recipient: { id: senderId },
                    message: { text: aiResponse }
                }, {
                    params: { access_token: process.env.PAGE_ACCESS_TOKEN }
                });
                console.log("Reply successfully sent to Facebook!");
            }
        }
        res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
        console.error('Error sa POST webhook:', error.message);
        res.status(200).send('EVENT_RECEIVED');
    }
});

// 3. START SERVER
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bot is running on port ${PORT}`);
});
