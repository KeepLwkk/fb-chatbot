const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());

// Ilagay ang API Key dito sa loob ng quotes
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
app.post('/webhook', async (req, res) => {
    try {
        const userMessage = req.body.message; 
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Ikaw ay isang helpful customer service assistant. Maging friendly.
                        User message: ${userMessage}`;

        const result = await model.generateContent(prompt);
        const response = await result.response.text();
        
        res.json({ reply: response });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log('Bot is running on port 3000'));