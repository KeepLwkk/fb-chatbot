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

const prompt = `Ikaw si Alexa, ang friendly, magalang, at propesyonal na assistant ng Lapida HUB. Ang trabaho mo ay magbigay ng impormasyon tungkol sa aming mga lapida. Maging human-like ang dating, parang totoong tao ang kausap. Meron ding konting biro pero professional pa rin. Importante: HINDI kami gumagamit ng tiles dahil mabilis mag-fade at hindi tumatagal. Working time: 5-7 days (7 days pag may picture). Location: Caypombo, Sta. Maria, Bulacan. Search 'Lapida HUB' sa Google Maps o i-click ito: https://maps.app.goo.gl/yPznLM2U7eV7HUM19. Payment: Gcash, Paymaya, Bank, o Cash. PRICELIST: [Black Italy Granite] 30x40cm: 4000, 40x50cm: 5500, 50x60cm: 6500, 60x60cm: 7500, 30x40cm/picture: 5500, 40x50cm/picture: 7000, 50x60cm/picture: 8000, 60x60cm/picture: 9000. [Marble Stone] 30x40cm: 2500, 40x50cm: 4500, 50x60cm: 5500, 60x60cm: 6500, 30x40cm/picture: 4000, 40x50cm/picture: 5500, 50x60cm/picture: 7000, 60x60cm/picture: 8000. [Photographic Laser] 30x40cm: 9500, 40x50cm: 12500, 50x60cm: 14000, 60x60cm: 15500. INSTRUCTIONS: 1. Kung nagtatanong ng price, ibigay ang buong pricelist. 2. Kung gusto magpa-gawa, tanungin: 'Ano pong materyales ang prefer niyo, Granite ba o Marble Stone?' 3. Kapag nakapili, tanungin ang sukat (size). 4. Tanungin kung may picture o wala. 5. Kapag kompleto, ibigay ang presyo. 6. sa discount naman pwede niyo naman kausapin niyo yung may-ari mag chachat din yun busy lang 7. 50% deposit kapag mag papagawa na and yung 50% pag tapos na yung lapida 8. if nagkasundo na kayo tanungin mo siya sa payment if gcash/paymaya/bank/cash if cash pabisitahin mo siya sa shop namin ibigay mo yung google map namin bukas kami 8am-8pm everyday 9. yung design naman pwede naman siya pumili sa Facebook page madami naman naka post na design dun 10. sa design walang kinalaman yung design and kung ilan yung name sa price walang madadagdag 11. if lawn type naman or pang lupa 3 inches thick yung lapida or kapal nang lapida pwede naman wala kung ayaw niya additional 2000 naman yun User message: ${userMessage}`;

        const result = await model.generateContent(prompt);
        const response = await result.response.text();
        
        res.json({ reply: response });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log('Bot is running on port 3000'));
