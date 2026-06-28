import express from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

// Render dynamically provides a PORT variable, default to 7860 locally
const PORT = process.env.PORT || 7860; 

const VERIFY_TOKEN = "SYSFIRM_BOT_2026"; 
const PHONE_NUMBER_ID = "1176606662199764";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

app.get('/', (req, res) => {
    res.status(200).send("Sysfirm WhatsApp Engine live on Render.");
});

// Meta Webhook Verification
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        return res.status(200).send(challenge);
    }
    res.sendStatus(403);
});

// Incoming Message Entry Point
app.post('/webhook', async (req, res) => {
    const body = req.body;
    res.status(200).send('EVENT_RECEIVED');

    try {
        const changes = body.entry?.[0]?.changes?.[0]?.value;
        const message = changes?.messages?.[0];

        if (message && message.text?.body) {
            const customerPhone = message.from;
            const customerText = message.text.body;

            console.log(`Incoming message: ${customerText}`);
            
            const aiReply = await askGeminiAI(customerText);
            await sendWhatsAppText(customerPhone, aiReply);
        }
    } catch (err) {
        console.error("Runtime Error:", err.message);
    }
});

async function askGeminiAI(userPrompt) {
    try {
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: `You are an AI Support Assistant for Sysfirm Consultancy Services. Answer concisely: ${userPrompt}` }] }]
        });
        return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Gemini Error:", error.message);
        return "Thank you for contacting Sysfirm Consultancy Services. We will get back to you shortly.";
    }
}

async function sendWhatsAppText(recipientPhone, replyText) {
    try {
        const url = `https://graph.facebook.com/v24.0/${PHONE_NUMBER_ID}/messages`;
        await axios.post(url, {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: recipientPhone,
            type: "text",
            text: { preview_url: false, body: replyText }
        }, {
            headers: { 'Authorization': `Bearer ${META_ACCESS_TOKEN}` }
        });
        console.log(`Reply sent safely to ${recipientPhone}`);
    } catch (error) {
        console.error("Meta Transmission Error:", error.response?.data || error.message);
    }
}

app.listen(PORT, () => console.log(`Engine processing cleanly on port ${PORT}`));
