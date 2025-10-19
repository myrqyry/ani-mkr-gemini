
import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const port = 3001;

app.use(express.json());

const ai = new GoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/generate-animation', async (req, res) => {
  try {
    const { imageData, prompt } = req.body;

    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash-image-preview' });

    const imagePart = {
      inlineData: {
        data: imageData,
        mimeType: 'image/png',
      },
    };

    const result = await model.generateContentStream([prompt, imagePart]);

    res.setHeader('Content-Type', 'application/json');

    for await (const chunk of result.stream) {
      res.write(JSON.stringify(chunk));
    }

    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate animation' });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
