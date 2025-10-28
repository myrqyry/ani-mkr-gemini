
import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import DOMPurify from 'isomorphic-dompurify';
import crypto from 'crypto';
import { SERVER_CONFIG } from './src/constants/server.js';
import { validateEnvironment } from './src/utils/validateEnv.js';

dotenv.config();
validateEnvironment();

const app = express();
const port = 3001;

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://yourdomain.com']
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

app.use(express.json({
  limit: SERVER_CONFIG.MAX_REQUEST_SIZE,
  verify: (req, res, buf) => {
    if (buf.length > SERVER_CONFIG.MAX_REQUEST_SIZE_BYTES) {
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
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(SERVER_CONFIG.DEFAULT_RATE_LIMIT_WINDOW_MS), 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || String(SERVER_CONFIG.DEFAULT_RATE_LIMIT_MAX_REQUESTS), 10),
  message: process.env.RATE_LIMIT_MESSAGE || 'Too many requests from this IP, please try again after a minute',
});

const validateApiKey = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const expectedKey = process.env.CLIENT_API_SECRET;

  if (!expectedKey) {
    // Check if the secret is configured, but don't leak this info in the response
    console.error('CLIENT_API_SECRET is not set');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const providedKey = authHeader.split(' ')[1];

  // Timing-safe comparison to mitigate timing attacks
  const providedKeyBuffer = Buffer.from(providedKey);
  const expectedKeyBuffer = Buffer.from(expectedKey);

  if (providedKeyBuffer.length !== expectedKeyBuffer.length) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!crypto.timingSafeEqual(providedKeyBuffer, expectedKeyBuffer)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

app.use('/api/*', validateApiKey);

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

  const sanitizedPrompt = DOMPurify.sanitize(prompt, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });

  const maliciousPatterns = [/<script/i, /javascript:/i, /on\w+=/i];
  if (maliciousPatterns.some(pattern => pattern.test(sanitizedPrompt))) {
    throw new Error('Potentially malicious content detected');
  }

  if (imageData && typeof imageData !== 'string') {
    throw new Error('Invalid imageData: must be a base64 string');
  }

  if (mimeType && !SERVER_CONFIG.SUPPORTED_IMAGE_FORMATS.includes(mimeType)) {
    throw new Error('Invalid mimeType: unsupported image format');
  }

  return { imageData, prompt: sanitizedPrompt, mimeType, fileUri };
};

const handleApiError = (error, operation, res) => {
  const sanitizedError = error instanceof Error ? error.message : 'Unknown error';
  const errorId = crypto.randomUUID();

  console.error(`${operation} error [${errorId}]:`, {
    timestamp: new Date().toISOString(),
    error: sanitizedError,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });

  res.status(500).json({
    error: `Failed to ${operation.toLowerCase()}`,
    errorId,
    ...(process.env.NODE_ENV === 'development' && { details: sanitizedError })
  });
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
    handleApiError(error, 'generate animation', res);
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

  if (!mimeType || !SERVER_CONFIG.SUPPORTED_IMAGE_FORMATS.includes(mimeType)) {
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
    handleApiError(error, 'upload file', res);
  }
});

const validatePostProcessInput = (body) => {
  const { base64SpriteSheet, mimeType, postProcessPrompt, base64StyleImage, styleMimeType, temperature } = body;

  if (!base64SpriteSheet || typeof base64SpriteSheet !== 'string') {
    throw new Error('Invalid base64SpriteSheet: must be a base64 string');
  }

  if (!mimeType || !SERVER_CONFIG.SUPPORTED_IMAGE_FORMATS.includes(mimeType)) {
    throw new Error('Invalid mimeType: unsupported image format');
  }

  if (!postProcessPrompt || typeof postProcessPrompt !== 'string' || postProcessPrompt.length > 5000) {
    throw new Error('Invalid postProcessPrompt: must be a string under 5000 characters');
  }

  if (base64StyleImage && typeof base64StyleImage !== 'string') {
    throw new Error('Invalid base64StyleImage: must be a base64 string');
  }

  if (styleMimeType && !SERVER_CONFIG.SUPPORTED_IMAGE_FORMATS.includes(styleMimeType)) {
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
    handleApiError(error, 'post-process animation', res);
  }
});

const validateDetectObjectsInput = (body) => {
  const { base64SpriteSheet, mimeType, detectionPrompt } = body;

  if (!base64SpriteSheet || typeof base64SpriteSheet !== 'string') {
    throw new Error('Invalid base64SpriteSheet: must be a base64 string');
  }

  if (!mimeType || !SERVER_CONFIG.SUPPORTED_IMAGE_FORMATS.includes(mimeType)) {
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
    handleApiError(error, 'detect objects', res);
  }
});
