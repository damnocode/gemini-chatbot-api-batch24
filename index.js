import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// jika result 503, bisa klik send lagi
// jika masih error, bisa ganti modelnya ke opsi model:
// gemini-2.5-flash-lite
// gemini-3.5-flash
// gemini-3.1-flash-lite
const GEMINI_MODEL = 'gemini-2.5-flash';

app.use(cors());
app.use(express.json());

// web
app.use(express.static(path.join(__dirname, 'public')))

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server ready on http://localhost:${PORT}`));

app.post('/api/chat', async (req, res) => {
    const { conversation } = req.body;
    try {
        if(!Array.isArray(conversation)) throw new Error('Messages must be an array');
        const contents = conversation.map(({ role, text }) => ({
            role,
            parts: [{ text}]
        }));
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents,
            config: {
                temperature: 0.9,
                systemInstruction: `
                Anda adalah asisten layanan diskominsa aceh jaya,
                admin dari layanan-layanan digital pemerintah kabupaten aceh jaya,
                jawab hanya terkait pertanyaan pembuatan email, website dinas,
                reset password akun email, akun login admin web dinas, pembuatan akun boinah acehjayakab,
                permintaan data PPID, layanan gangguan jaringan internet,
                sapa pengguna dengan ramah tapi jangan sapa tiap saat, lalu tanyakan kebutuhannya apa,
                Cukup jawab ringkas dan jangan terlalu panjang agar mudah dipahami.
                setelah dapat kebutuhan dan keluhan,
                informasikan juga nama, unit kerja (bidang/satker),nomor kontak yang bisa di hubungi,
                rangkum, generate dan sampaikan nomor/tiket pengaduan untuk pengguna,
                lalu sampaikan request dari pengguna ke admin`
            }
        });
        res.status(200).json({ result: response.text })
    }
    catch (e) {
        res.status(500).json({ error: e.message })
    }
});