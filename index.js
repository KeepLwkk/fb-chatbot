const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());

// 1. VERIFICATION CODE PARA SA META WEBHOOK
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Dito dapat mag-match yung token na ilalagay mo sa Meta Dashboard
    if (mode === 'subscribe' && token === 'alexa_secret_code') {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// 2. CHATBOT LOGIC
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/webhook', async (req, res) => {
    try {
        // Ang Meta ay nagpapadala ng data sa loob ng req.body.entry
        const data = req.body;
        
        if (data.object === 'page') {
            const userMessage = data.entry[0].changes[0].value.messages[0].text.body;
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const prompt = `Ikaw si Alexa, ang friendly, magalang, at propesyonal na assistant ng Lapida HUB. [Dito ilagay yung mahabang instruction mo...] User message: ${userMessage}`;

            const result = await model.generateContent(prompt);
            const response = await result.response.text();
            
            // Note: Sa production, kailangan mo pang i-send ang response pabalik sa Messenger API gamit ang axios.
            res.status(200).send('EVENT_RECEIVED');
        }
    } catch (error) {
        console.error(error);
        res.status(200).send('EVENT_RECEIVED'); // Para hindi mag-error ang Meta
    }
});

app.listen(process.env.PORT || 3000, () => console.log('Bot is running'));
