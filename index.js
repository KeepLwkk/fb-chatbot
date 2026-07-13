const express = require('express');
const { OpenAI } = require('openai');
const axios = require('axios');

const app = express();
app.use(express.json());

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENAI_API_KEY, // Siguraduhing naka-set ito sa Render
});

app.get('/webhook', (req, res) => {
    if (req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
        res.status(200).send(req.query['hub.challenge']);
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

                // API Call na may reasoning enabled
                const apiResponse = await client.chat.completions.create({
                    model: 'google/gemma-4-26b-a4b-it:free',
                    messages: [
                        { role: 'system', content: 'Ikaw si Alexa, assistant ng Lapida HUB.' },
                        { role: 'user', content: userMessage }
                    ],
                    extra_body: { reasoning: { enabled: true } } // Tamang syntax para sa OpenRouter reasoning
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
        console.error('Bot Error:', error.message);
        res.status(200).send('EVENT_RECEIVED');
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Bot running on ${PORT}`));
