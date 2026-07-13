const express = require('express');
const { OpenAI } = require('openai');
const axios = require('axios');

const app = express();
app.use(express.json());

// Setup ng OpenAI client para sa OpenRouter
const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

// 1. WEBHOOK VERIFICATION (Kailangan ito para ma-verify ng Facebook ang URL mo)
app.get('/webhook', (req, res) => {
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('WEBHOOK_VERIFIED');
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

                // Tawag sa OpenRouter gamit ang OpenAI SDK at GPT-OSS-120B
                const apiResponse = await client.chat.completions.create({
                    model: 'openai/gpt-oss-120b:free',
                    messages: [
                        { role: 'system', content: 'Ikaw si Alexa, assistant ng Lapida HUB.' },
                        { role: 'user', content: userMessage }
                    ]
                });

                const aiResponse = apiResponse.choices[0].message.content;

                // Send back to Messenger
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
        console.error('OpenAI/Webhook Error:', error.message);
        res.status(200).send('EVENT_RECEIVED');
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bot is running on port ${PORT}`);
});
