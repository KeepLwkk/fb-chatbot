app.post('/webhook', async (req, res) => {
    try {
        const entry = req.body.entry ? req.body.entry[0] : null;
        if (entry && entry.messaging) {
            const messaging = entry.messaging[0];
            const senderId = messaging.sender.id;
            
            if (messaging.message && messaging.message.text) {
                const userMessage = messaging.message.text;
                
                // Dito ang importante: gemini-1.5-flash
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
        console.error('FINAL ERROR LOG:', error.message);
        res.status(200).send('EVENT_RECEIVED');
    }
});
