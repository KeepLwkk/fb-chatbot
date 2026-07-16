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
    replyCount: { type: Number, default: 0 },
    messages: [{
        role: { type: String, required: true },
        content: { type: String, required: true }
    }]
});
const Chat = mongoose.model('Chat', ChatSchema);

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

        let chatRecord = await Chat.findOne({ senderId });
        
        if (!chatRecord) {
            chatRecord = new Chat({
                senderId,
                replyCount: 0,
                messages: [{ 
                    role: 'system', 
                    content: `Ikaw si Alexa, ang dedikadong professional assistant ng Lapida HUB. Ang trabaho mo ay sumagot sa mga inquiries tungkol sa lapida at memorial services. Etong mga rules mo: 1. STYLE: Mabilis, maikli, direkta, at natural na Taglish—parang tropa o kaibigan lang kausap pero professional pa rin. Iwasan ang robotic na pananalita. 2. SCOPE: Usapang lapida lang. Kung lumihis ang customer, ibalik sila sa topic nang mahinahon. 3. LIMITS: Sagutin lang ang tinanong para hindi malito ang customer. 4. ESCALATION: Huwag mag-imbento. Kung hindi mo alam ang sagot o gustong makausap ang boss, ibigay ang number ni Christian Ferrer (09922645395). 5. PRICING & SERVICES: Black Granite (30x40cm: 4k, 40x50cm: 5.5k, 50x60cm: 6.5k, 60x60cm: 7.5k). Marble (30x40cm: 2.5k, 40x50cm: 4k, 50x60cm: 5.5k, 60x60cm: 6.5k). Lawn Type Granite (12x24x3: 7.5k, 15x24x3: 9.5k, 18x24x3: 11.5k). Lawn Type Marble (12x24x3: 6.5k, 15x24x3: 8.5k, 18x24x3: 10k). Photographic Laser (30x40cm: 10.5k, 40x50cm: 12.5k, 50x60cm: 13.5k, 60x60cm: 15k). ADD-ONS: note: wala pang picture yung mga price na yan if gusto nila nang may picture may additional 1500 4.5inch oven-baked non-faded picture ay +1.5k (may 1-year warranty) . 6. PROCESS: 50% DP via Gcash/Paymaya (09922645395 - Christian Ferrer), full payment bago delivery. No COD. Turnaround is 6-7 days (5 days kung rush/no pending). Requirements: Name, Born/Died, Dedication, at Design. 7. LOCATION & SHIPPING: Sta. Maria, Bulacan (https://maps.app.goo.gl/3t9XH5adeoSxGp8K7), Mon-Sat, 8AM-5PM. Free shipping within 5km, beyond that may extra charge. 8. HANDLING OBJECTIONS: Kapag sinabing "Mahal", sabihin mong laser engraved ang gamit kaya sigurado ang tibay at pulido. I-advise sila na tumawag kay Christian Ferrer (09922645395) para sa posibleng discount. 9. TIPS: Standard size for columbarium is 40x50cm up to 60cm. Maging maikli pero kumpleto sa details. 10. If hindi sila sigurado sa size nang lapida nila pwede sila mag tanong mismo sa sementeryo para sa size nila ` 
                }]
            });
        }

        // --- LIMITATION LOGIC ---
        if (chatRecord.replyCount >= 5) {
            return res.status(200).send('EVENT_RECEIVED');
        }

        chatRecord.messages.push({ role: 'user', content: userMessage });

        const apiResponse = await client.chat.completions.create({
            model: 'gpt-4o', 
            messages: chatRecord.messages, // Dito ko inayos yung comma
            temperature: 0.5,
            presence_penalty: 0.2,
            frequency_penalty: 0.3
        });

        const aiResponse = apiResponse.choices[0].message.content;

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
