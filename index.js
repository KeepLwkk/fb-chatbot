const express = require('express');
const { OpenAI } = require('openai');
const axios = require('axios');

const app = express();
app.use(express.json());

// Setup para sa GitHub Models
const client = new OpenAI({
  baseURL: 'https://models.inference.ai.azure.com',
  apiKey: process.env.OPENAI_API_KEY, // Ilagay dito ang iyong GitHub token
});

// 1. WEBHOOK VERIFICATION
app.get('/webhook', (req, res) => {
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// 2. CHATBOT LOGIC
app.post('/webhook', async (req, res) => {
    try {
        const entry = req.body.entry ? req.body.entry[0] : null;
        
        if (entry && entry.messaging) {
            const messaging = entry.messaging[0];
            const senderId = messaging.sender.id;
            
            if (messaging.message && messaging.message.text) {
                const userMessage = messaging.message.text;

                // Gamitin ang tamang model name mula sa GitHub Models
                const apiResponse = await client.chat.completions.create({
                    model: 'gpt-4o-mini', 
                    messages: [
                        { role: 'system', content: 'Ikaw si Alexa, assistant ng Lapida HUB.' },
                        { role: 'user', content: userMessage }
                    ],
                    temperature: 0.7
                });

                const aiResponse = apiResponse.choices[0].message.content;

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
        console.error('Error:', error.response ? error.response.data : error.message);
        res.status(200).send('EVENT_RECEIVED');
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Bot running on port ${PORT}`));
