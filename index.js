const express = require('express');
const { OpenAI } = require('openai');
const axios = require('axios');

const app = express();
app.use(express.json());

// GitHub Models Setup
const client = new OpenAI({
  baseURL: 'https://models.inference.ai.azure.com',
  apiKey: process.env.OPENAI_API_KEY, 
});

// 1. WEBHOOK VERIFICATION (Para sa Facebook)
app.get('/webhook', (req, res) => {
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        return res.status(200).send(challenge);
    }
    res.sendStatus(403);
});

// 2. CHATBOT LOGIC
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'page') {
        for (const entry of body.entry) {
            const webhook_event = entry.messaging[0];
            const senderId = webhook_event.sender.id;

            if (webhook_event.message && webhook_event.message.text) {
                const userMessage = webhook_event.message.text;

                try {
                    // Call GitHub Model
                    const apiResponse = await client.chat.completions.create({
                        model: 'gpt-4o-mini',
                        messages: [
                            { role: 'system', content: 'Ikaw si Alexa, ang matulungin na assistant ng Lapida HUB. Sumagot nang magalang at propesyonal tungkol sa aming mga serbisyo.' },
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
                } catch (err) {
                    console.error('AI or FB Error:', err.message);
                }
            }
        }
        return res.status(200).send('EVENT_RECEIVED');
    }
    res.sendStatus(404);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server is running on port ${PORT}`));
