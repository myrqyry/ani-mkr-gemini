
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
  if (fs.existsSync(DB_FILE)) {
    const data = fs.readFileSync(DB_FILE);
    return JSON.parse(data);
  }
  return {};
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

/**
 * @route POST /api/post-process
 * @description Post-processes an animation.
 * @param {object} req - The request object.
 * @param {object} req.body - The request body.
 * @param {string} req.body.base64SpriteSheet - The base64-encoded sprite sheet.
 * @param {string} req.body.mimeType - The mime type of the sprite sheet.
 * @param {string} req.body.postProcessPrompt - The prompt for post-processing.
 * @param {string} [req.body.base64StyleImage] - The base64-encoded style image.
 * @param {string} [req.body.styleMimeType] - The mime type of the style image.
 * @param {number} [req.body.temperature] - The temperature for the model.
 * @param {object} res - The response object.
 */
app.post('/api/post-process', apiLimiter, async (req, res) => {
  try {
    const {
      base64SpriteSheet,
      mimeType,
      postProcessPrompt,
      base64StyleImage,
      styleMimeType,
      temperature,
    } = req.body;

    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash-image-preview' });

    const parts = [
      {
        inlineData: {
          data: base64SpriteSheet,
          mimeType,
        },
      },
    ];

    if (base64StyleImage && styleMimeType) {
      parts.push({
        inlineData: {
          data: base64StyleImage,
          mimeType: styleMimeType,
        },
      });
    }

    parts.push({ text: postProcessPrompt });

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
      config: {
        responseMimeType: 'application/json',
        temperature,
      },
    });

    res.json(result.response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to post-process animation' });
  }
});

/**
 * @route POST /api/detect-objects
 * @description Detects objects in an animation.
 * @param {object} req - The request object.
 * @param {object} req.body - The request body.
 * @param {string} req.body.base64SpriteSheet - The base64-encoded sprite sheet.
 * @param {string} req.body.mimeType - The mime type of the sprite sheet.
 * @param {string} req.body.detectionPrompt - The prompt for object detection.
 * @param {object} res - The response object.
 */
app.post('/api/detect-objects', apiLimiter, async (req, res) => {
  try {
    const { base64SpriteSheet, mimeType, detectionPrompt } = req.body;

    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: base64SpriteSheet,
                mimeType,
              },
            },
            { text: detectionPrompt },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    res.json(result.response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to detect objects' });
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

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
