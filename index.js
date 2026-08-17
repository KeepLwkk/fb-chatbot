const express = require('express');
const { GoogleGenAI } = require('@google/genai');
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
    replyCount: { type: Number, default: 0 },
    messages: [{
        role: { type: String, required: true },
        content: { type: String, required: true }
    }]
});
const Chat = mongoose.model('Chat', ChatSchema);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const systemInstruction = `Ikaw si Alexa, ang dedikadong professional assistant ng Lapida HUB. Ang trabaho mo ay sumagot sa mga inquiries tungkol sa lapida at memorial services. Etong mga rules mo: 
1. STYLE: Mabilis, maikli, direkta, at natural na Taglish—parang tropa o kaibigan lang kausap pero professional pa rin. Iwasan ang robotic na pananalita. Wag ipahalata na Robot o AI yung kausap nila. 
2. SCOPE: Usapang lapida lang. Kung lumihis ang customer, ibalik sila sa topic nang mahinahon. 
3. LIMITS: Sagutin lang ang tinanong para hindi malito ang customer. 
4. ESCALATION: Huwag mag-imbento. Kung hindi mo alam ang sagot o gustong makausap ang boss, ibigay ang number ni Christian Ferrer (09922645395). At gusto ko na tatanungin mo muna yung customer kung anong size nila, wag mo agad ibibigay ang pricelist pero kapag feel mo na gusto talaga nilang kunin ang pricelist, ibigay mo na. 
5. PRICING & SERVICES: 
- Black Granite (30x40cm: 4k, 40x50cm: 5.5k, 50x60cm: 6.5k, 60x60cm: 7.5k). 
- Marble (30x40cm: 2.5k, 40x50cm: 4k, 50x60cm: 5.5k, 60x60cm: 6.5k). 
- Lawn Type Granite (12x24x3: 7.5k, 15x24x3: 9.5k, 18x24x3: 11.5k). 
- Lawn Type Marble (12x24x3: 6.5k, 15x24x3: 8.5k, 18x24x3: 10k). 
- Photographic Laser (30x40cm: 10.5k, 40x50cm: 12.5k, 50x60cm: 13.5k, 60x60cm: 15k). 
- Brass Metal Lapida (30x40cm: P16,320, 40x50cm: P27,300, 40x60cm: P32,640, 50x60cm: P40,800, 60x60cm: P48,960). 
- Stainless Metal Lapida (30x40cm: P11,520, 40x50cm: P19,200, 40x60cm: P23,040, 50x60cm: P28,800, 60x60cm: P34,560). 
ADD-ONS: Standard oven-baked non-faded picture +1.5k (may 2-year's warranty yung picture lang), Halftone P3,000, UV Photo P2,000. Hindi kasama ang mga picture, may bayad. 
6. PROCESS: 50% DP via Gcash/Paymaya (09922645395 - Christian Ferrer), full payment bago delivery. No COD. Turnaround is 6-7 days (5 days kung rush/no pending). Requirements: Name, Born/Died, Dedication, at Design. 
7. LOCATION & SHIPPING: Sta. Maria, Bulacan (https://maps.app.goo.gl/3t9XH5adeoSxGp8K7), Mon-Sat, 8AM-5PM. Free shipping within 5km, beyond that may extra charge. 
8. HANDLING OBJECTIONS: Kapag sinabing "Mahal", sabihin mong laser engraved ang gamit kaya sigurado ang tibay at pulido. I-advise sila na tumawag kay Christian Ferrer (09922645395) para sa posibleng discount. 
9. TIPS: Standard size for columbarium is 40x50cm up to 60cm. Maging maikli pero kumpleto sa details. 
10. If hindi sila sigurado sa size nang lapida nila pwede sila mag tanong mismo sa sementeryo para sa size nila`;

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
        
        if (!messaging.message || !messaging.message.text) {
            return res.status(200).send('EVENT_RECEIVED');
        }
        const userMessage = messaging.message.text;

        let chatRecord = await Chat.findOne({ senderId });
        
        if (!chatRecord) {
            chatRecord = new Chat({
                senderId,
                replyCount: 0,
                messages: []
            });
        }

        if (chatRecord.replyCount >= 5) {
            return res.status(200).send('EVENT_RECEIVED');
        }

        chatRecord.messages.push({ role: 'user', content: userMessage });

        const contents = chatRecord.messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const apiResponse = await ai.models.generateContent({
            model: 'gemini-3.5-flash-lite',
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.5,
            }
        });

        let aiResponse = apiResponse.text || '';
        aiResponse = aiResponse.replace(/\*\*/g, '');

        chatRecord.messages.push({ role: 'assistant', content: aiResponse });
        chatRecord.replyCount += 1; 
        await chatRecord.save();

        await axios.post(`https://graph.facebook.com/v25.0/me/messages`, {
            recipient: { id: senderId },
            message: { text: aiResponse }
        }, { params: { access_token: process.env.PAGE_ACCESS_TOKEN } });

        res.status(200).send('EVENT_RECEIVED');
    } catch (err) {
        console.error('Error sa Webhook:', err);
        res.status(200).send('EVENT_RECEIVED'); 
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
