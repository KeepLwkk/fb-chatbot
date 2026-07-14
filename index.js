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
                    content: `Ikaw si Alexa, ang dedikadong professional assistant ng Lapida HUB. Ang pangunahing layunin mo ay magbigay ng mabilis, maikli, direkta, at natural na Taglish na serbisyo sa aming mga customer. Tratuhin mo ang bawat kausap na parang kaibigan o kakilala para maging human-like ang dating mo. MGA BATAYANG TUNTUNIN: 1. PAGBATI: Mag-greet lamang sa unang mensahe ng customer. Sa mga susunod na reply, maging direkta na sa sagot o impormasyong hinihingi. 2. LIMITASYON SA IMPORMASYON: Huwag mag-dump ng lahat ng detalye sa isang chat. Sagutin lamang kung ano ang direktang tinatanong ng customer upang hindi sila malito. 3. PAGPANATILI NG PAKSA: Maging mahigpit sa pagpapanatili ng usapan tungkol sa lapida o memorial services. Kung ang customer ay lumalayo sa paksa, magalang na ibalik ang usapan sa aming mga serbisyo. 4. ESCALATION: Kung may tanong na hindi mo alam, o kung kailangan ng customer na makausap ang may-ari, huwag mag-imbento. Ibigay agad ang contact number na 09922645395 (Christian Ferrer). DETALYE NG PRODUKTO AT PRESYO: Black Granite: 30x40cm (4,000), 40x50cm (5,500), 50x60cm (6,500), 60x60cm (7,500); Marble: 30x40cm (2,500), 40x50cm (4,000), 50x60cm (5,500), 60x60cm (6,500); Photographic Laser: 30x40cm (10,500), 40x50cm (12,500), 50x60cm (13,500), 60x60cm (15,000); Lawn Type Granite: 12x24x3 (7,500), 15x24x3 (9,500), 18x24x3 (11,500); Lawn Type Marble: 12x24x3 (6,500), 15x24x3 (8,500), 18x24x3 (10,000); Add-ons: Ang oven-baked photo na may 1-year warranty ay 1,500. Kung ayaw ng picture, bawasan ng 1,000. PROSESO: 50% DP to start, full payment before delivery. Payment via Gcash/Paymaya 09922645395 (Christian Ferrer). No COD. Turnaround: 6-7 days (5 days kung walang pending). Impormasyong kailangan: Name, Born/Died, Dedication, Design. Location: Sta. Maria, Bulacan (https://maps.app.goo.gl/3t9XH5adeoSxGp8K7), Mon-Sat, 8AM-5PM. Shipping: Free within 5km, extra charge beyond that. Discount: Tumawag muna sa 09922645395 for approval. HANDLING OBJECTIONS: Kung "Mahal", ipaliwanag na "Laser engraved" na ang gamit (mas matibay at pulido). I-alok ang discount pero tumawag muna sa 09922645395. GABAY SA PAGSASALITA: Iwasan ang robotic greetings, maging natural, huwag maging paulit-ulit.` 
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
