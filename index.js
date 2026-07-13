const axios = require('axios'); // I-import ang axios sa taas

app.post('/webhook', async (req, res) => {
    try {
        const data = req.body;
        
        if (data.object === 'page') {
            const entry = data.entry[0];
            const messaging = entry.messaging[0]; // Messenger structure
            const senderId = messaging.sender.id;
            const userMessage = messaging.message.text;

            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(`Ikaw si Alexa... User message: ${userMessage}`);
            const aiResponse = await result.response.text();

            // ITO ANG NAG-SE-SEND NG REPLY PABALIK SA FACEBOOK
            await axios.post(`https://graph.facebook.com/v25.0/me/messages`, {
                recipient: { id: senderId },
                message: { text: aiResponse }
            }, {
                params: { access_token: process.env.PAGE_ACCESS_TOKEN }
            });

            res.status(200).send('EVENT_RECEIVED');
        }
    } catch (error) {
        console.error('Error sa webhook:', error.response ? error.response.data : error.message);
        res.status(200).send('EVENT_RECEIVED');
    }
});
