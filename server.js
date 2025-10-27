
import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

dotenv.config();

const app = express();
const port = 3001;

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://yourdomain.com']
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf) => {
    if (buf.length > 52428800) { // 50MB
      throw new Error('Request too large');
    }
  }
}));

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY environment variable is required');
  process.exit(1);
}
const ai = new GoogleGenerativeAI({ apiKey });

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
const validateGenerateAnimationInput = (body) => {
  const { imageData, prompt, mimeType, fileUri } = body;

  if (!prompt || typeof prompt !== 'string' || prompt.length > 5000) {
    throw new Error('Invalid prompt: must be a string under 5000 characters');
  }

  if (imageData && typeof imageData !== 'string') {
    throw new Error('Invalid imageData: must be a base64 string');
  }

  if (mimeType && !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(mimeType)) {
    throw new Error('Invalid mimeType: unsupported image format');
  }

  return { imageData, prompt, mimeType, fileUri };
};

app.post('/api/generate-animation', apiLimiter, async (req, res) => {
  try {
    const { imageData, prompt, mimeType, fileUri } = validateGenerateAnimationInput(req.body);

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
    const sanitizedError = error instanceof Error ? error.message : 'Unknown error';
    console.error('Animation generation error:', {
      timestamp: new Date().toISOString(),
      error: sanitizedError,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    res.status(500).json({
      error: 'Failed to generate animation',
      ...(process.env.NODE_ENV === 'development' && { details: sanitizedError })
    });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

const validateUploadFileInput = (body) => {
  const { file, mimeType } = body;

  if (!file || typeof file !== 'string') {
    throw new Error('Invalid file: must be a base64 string');
  }

  if (!mimeType || !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(mimeType)) {
    throw new Error('Invalid mimeType: unsupported image format');
  }

  return { file, mimeType };
};

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
    const { file, mimeType } = validateUploadFileInput(req.body);
    const result = await ai.uploadFile(file, { mimeType });
    res.json(result);
  } catch (error) {
    const sanitizedError = error instanceof Error ? error.message : 'Unknown error';
    console.error('File upload error:', {
      timestamp: new Date().toISOString(),
      error: sanitizedError,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    res.status(500).json({
      error: 'Failed to upload file',
      ...(process.env.NODE_ENV === 'development' && { details: sanitizedError })
    });
  }
});

const validatePostProcessInput = (body) => {
  const { base64SpriteSheet, mimeType, postProcessPrompt, base64StyleImage, styleMimeType, temperature } = body;

  if (!base64SpriteSheet || typeof base64SpriteSheet !== 'string') {
    throw new Error('Invalid base64SpriteSheet: must be a base64 string');
  }

  if (!mimeType || !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(mimeType)) {
    throw new Error('Invalid mimeType: unsupported image format');
  }

  if (!postProcessPrompt || typeof postProcessPrompt !== 'string' || postProcessPrompt.length > 5000) {
    throw new Error('Invalid postProcessPrompt: must be a string under 5000 characters');
  }

  if (base64StyleImage && typeof base64StyleImage !== 'string') {
    throw new Error('Invalid base64StyleImage: must be a base64 string');
  }

  if (styleMimeType && !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(styleMimeType)) {
    throw new Error('Invalid styleMimeType: unsupported image format');
  }

  if (temperature && (typeof temperature !== 'number' || temperature < 0 || temperature > 1)) {
    throw new Error('Invalid temperature: must be a number between 0 and 1');
  }

  return { base64SpriteSheet, mimeType, postProcessPrompt, base64StyleImage, styleMimeType, temperature };
};

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
    } = validatePostProcessInput(req.body);

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
    const sanitizedError = error instanceof Error ? error.message : 'Unknown error';
    console.error('Post-processing error:', {
      timestamp: new Date().toISOString(),
      error: sanitizedError,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    res.status(500).json({
      error: 'Failed to post-process animation',
      ...(process.env.NODE_ENV === 'development' && { details: sanitizedError })
    });
  }
});

const validateDetectObjectsInput = (body) => {
  const { base64SpriteSheet, mimeType, detectionPrompt } = body;

  if (!base64SpriteSheet || typeof base64SpriteSheet !== 'string') {
    throw new Error('Invalid base64SpriteSheet: must be a base64 string');
  }

  if (!mimeType || !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(mimeType)) {
    throw new Error('Invalid mimeType: unsupported image format');
  }

  if (!detectionPrompt || typeof detectionPrompt !== 'string' || detectionPrompt.length > 5000) {
    throw new Error('Invalid detectionPrompt: must be a string under 5000 characters');
  }

  return { base64SpriteSheet, mimeType, detectionPrompt };
};

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
    const { base64SpriteSheet, mimeType, detectionPrompt } = validateDetectObjectsInput(req.body);

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
    const sanitizedError = error instanceof Error ? error.message : 'Unknown error';
    console.error('Object detection error:', {
      timestamp: new Date().toISOString(),
      error: sanitizedError,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    res.status(500).json({
      error: 'Failed to detect objects',
      ...(process.env.NODE_ENV === 'development' && { details: sanitizedError })
    });
  }
});
