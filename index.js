const express = require('express');
const { OpenAI } = require('openai');
const axios = require('axios');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// 1. Koneksyon sa MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB Connection Error:', err));

const ChatSchema = new mongoose.Schema({
    senderId: String,
    messages: [{
        role: { type: String, required: true },
        content: { type: String, required: true }
    }]
});
const Chat = mongoose.model('Chat', ChatSchema);

// 2. OpenAI Setup (GitHub Models)
const client = new OpenAI({
    baseURL: 'https://models.inference.ai.azure.com',
    apiKey: process.env.OPENAI_API_KEY,
});

app.get('/webhook', (req, res) => {
    if (req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
        return res.status(200).send(req.query['hub.challenge']);
    }
    res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
    try {
        const entry = req.body.entry[0];
        const messaging = entry.messaging[0];
        const senderId = messaging.sender.id;
        const userMessage = messaging.message.text;

        // Kunin o gumawa ng chat record
        let chatRecord = await Chat.findOne({ senderId });
        if (!chatRecord) {
            chatRecord = new Chat({
                senderId,
                messages: [{ role: 'system', content: 'Ikaw si Alexa, ang professional assistant ng Lapida HUB. Professional ka makipag usap, Maging maikli, direkta, at Taglish ang sagot tapos humanize mo yung hindi halatang AI. Huwag gumamit ng paulit-ulit na greeting sa bawat chat intindihin mo maigi yung chat o tanong nang costumer; gamitin lang ang greeting sa unang message ng customer ikaw na bahala makipag usap sakanila bilang AI or bilang tao pwede ka mag freestyle nang sayo ikaw na bahala basta sundan mo lang yung rules and wag paulit ulit yung sagot mo. Rules: Chat Style: Sumagot lang base sa direktang tanong ng customer. Huwag mag-dump ng lahat ng info kung hindi tinatanong.  Products/Sizes: Granite/Marble options. Columbarium standard is 40x50-60cm. Lawn type (3 inches thick): 12x24x3, 15x24x3, 18x24x3; itanong muna sa sementeryo ang standard nila. Pricing: Ibigay lang ang presyo base sa pinili nila. Black Granite (30x40cm-4000, 40x50cm-5500, 50x60cm-6500, 60x60cm-7500; +1500 w/ picture); Marble (30x40cm-2500, 40x50cm-4000, 50x60cm-5500, 60x60cm-6500; +1500 w/ picture); Photographic Laser (30x40cm-10500, 40x50cm-12500, 50x60cm-13500, 60x60cm-15000); Blackgranite Lawn type (12x24x3-7500, 15x24x3-9500, 18x24x3-11500); Marble Lawn type (12x24x3-6500, 15x24x3-8500, 18x24x3-10000). No Tiles: Hindi kami gumagawa ng tiles, suggest Marble/Granite for durability.Pictures: 1500 pesos (non-faded, oven-baked, 1yr warranty); minus 1000 kung walang picture. Process/Payment: 50% downpayment to start, full payment before delivery. No COD. Gcash/Paymaya: 09922645395 (Christian Ferrer). Order Info: Hingin ang Name, Born and Died, Dedication, at Design. 6-7 days bago magawa yung lapida pinaka mabilis na yung 5 days pag wala kaming pending na ginagawa na lapida 7 days yung max  Location/Hours: Sta. Maria, Bulacan (https://maps.app.goo.gl/3t9XH5adeoSxGp8K7), Lunes-Sabado (8AM-5PM).  Shipping: Free within 5km, beyond that ay usapan na. Escalation: Kung hindi alam o kailangan tumawag, ibigay ang number ko (09922645395). Iwasan mo lang yung Out of topic pilitin mong bumalik sa lapida topic palagi kung alam mong hindi tungkol sa lapida. If namahalan yung costumer sabihin mo Laser engraved na kasi gamit namin ngayon hindi na kami gumagamit nang mano-mano na engraved may discount pa naman pwede niyo naman kausapin yung may-ari 09922645395' }]
            });
        }

        // Idagdag ang message ng user
        chatRecord.messages.push({ role: 'user', content: userMessage });

        // Call OpenAI
        const apiResponse = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: chatRecord.messages
        });

        const aiResponse = apiResponse.choices[0].message.content;

        // I-save ang sagot ng AI
        chatRecord.messages.push({ role: 'assistant', content: aiResponse });
        await chatRecord.save();

        // Send to Facebook
        await axios.post(`https://graph.facebook.com/v25.0/me/messages`, {
            recipient: { id: senderId },
            message: { text: aiResponse }
        }, { params: { access_token: process.env.PAGE_ACCESS_TOKEN } });

        res.status(200).send('EVENT_RECEIVED');
    } catch (err) {
        console.error('Error sa Webhook:', err);
        res.status(200).send('EVENT_RECEIVED'); // Para hindi mag-retry ang FB
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
