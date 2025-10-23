
import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
const port = 3001;
const DB_FILE = './animations.json';

app.use(express.json({ limit: '50mb' }));

const ai = new GoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

const readDB = () => {
  if (!fs.existsSync(DB_FILE)) {
    return {};
  }

  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    // Handle empty file case
    if (data.trim() === '') {
        return {};
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading or parsing DB file:', error);
    return {}; // Return empty object on error to prevent crash
  }
};

const writeDB = (data) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10), // Limit each IP to 10 requests per windowMs
  message: process.env.RATE_LIMIT_MESSAGE || 'Too many requests from this IP, please try again after a minute',
});

/**
 * @route POST /api/generate-animation
 * @description Generates an animation based on an image and a prompt.
 * @param {object} req - The request object.
 * @param {object} req.body - The request body.
 * @param {string} req.body.imageData - The base64-encoded image data.
 * @param {string} req.body.prompt - The prompt for the animation.
 * @param {string} req.body.mimeType - The mime type of the image.
 * @param {object} res - The response object.
 */
app.post('/api/generate-animation', apiLimiter, async (req, res) => {
  try {
    const { imageData, prompt, mimeType, fileUri } = req.body;

    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

    let imagePart;
    if (fileUri) {
      imagePart = {
        fileData: {
          mimeType,
          fileUri,
        },
      };
    } else {
      imagePart = {
        inlineData: {
          data: imageData,
          mimeType: mimeType || 'image/png',
        },
      };
    }

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

/**
 * @route POST /api/upload-file
 * @description Uploads a file to the Gemini File API.
 * @param {object} req - The request object.
 * @param {object} req.body - The request body.
 * @param {string} req.body.file - The base64-encoded file data.
 * @param {string} req.body.mimeType - The mime type of the file.
 * @param {object} res - The response object.
 */
app.post('/api/upload-file', apiLimiter, async (req, res) => {
  try {
    const { file, mimeType } = req.body;
    const result = await ai.uploadFile(file, { mimeType });
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

app.post('/api/share', (req, res) => {
  const { animationData } = req.body;
  const id = uuidv4();
  const animations = readDB();
  animations[id] = animationData;
  writeDB(animations);
  res.json({ id });
});

app.get('/api/share/:id', (req, res) => {
  const { id } = req.params;
  const animations = readDB();
  const animationData = animations[id];
  if (animationData) {
    res.json(animationData);
  } else {
    res.status(404).json({ error: 'Animation not found' });
  }
});
