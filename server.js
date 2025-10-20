
import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const port = 3001;

app.use(express.json({ limit: '10mb' }));

const ai = new GoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

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
      if (!mimeType) {
        return res.status(400).json({ error: 'mimeType is required when fileUri is provided' });
      }
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
    if (!file || !mimeType) {
      return res.status(400).json({ error: 'Request body must contain file and mimeType' });
    }
    const result = await ai.uploadFile(file, { mimeType });
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});
