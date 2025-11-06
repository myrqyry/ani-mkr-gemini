
import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import DOMPurify from 'isomorphic-dompurify';
import crypto from 'crypto';
import helmet from 'helmet';
import { z } from 'zod';
import { SERVER_CONFIG } from './src/constants/server.js';
import { validateEnvironment } from './src/utils/validateEnv.js';
import { getEnvironmentConfig } from './src/config/environment.js';
import { GenerateAnimationRequestSchema, GenerateAnimationResponseSchema } from './src/types/schemas.js';

dotenv.config();
validateEnvironment();

const app = express();
const port = 3001;
const envConfig = getEnvironmentConfig();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://generativelanguage.googleapis.com"],
    },
  },
}));

app.use(cors({
  origin: envConfig.origins,
  credentials: envConfig.corsCredentials
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
    console.error('CLIENT_API_SECRET is not set');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const providedKey = authHeader.split(' ')[1];

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

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

class SecurityError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SecurityError';
  }
}

const handleApiError = (error, operation, res) => {
  const errorId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  console.error(`${operation} error [${errorId}]:`, {
    timestamp,
    error: error.message,
    stack: error.stack,
  });

  let clientError = 'An unexpected error occurred';
  let statusCode = 500;

  if (error instanceof z.ZodError) {
    clientError = 'Invalid input: ' + error.errors.map(e => e.message).join(', ');
    statusCode = 400;
  } else if (error instanceof ValidationError) {
    clientError = error.message;
    statusCode = 400;
  } else if (error instanceof SecurityError) {
    clientError = 'Request rejected for security reasons';
    statusCode = 403;
  }

  res.status(statusCode).json({
    error: clientError,
    errorId,
    timestamp,
  });
};

app.post('/api/generate-animation', apiLimiter, async (req, res) => {
  try {
    const validatedInput = GenerateAnimationRequestSchema.parse(req.body);
    const { imageData, prompt, mimeType, fileUri } = validatedInput;

    const sanitizedPrompt = DOMPurify.sanitize(prompt.trim(), {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: false,
      REMOVE_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
    });

    const dangerousPatterns = [
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /javascript\s*:/gi,
      /on\w+\s*=/gi,
      /data\s*:/gi,
      /vbscript\s*:/gi,
    ];

    if (dangerousPatterns.some(pattern => pattern.test(sanitizedPrompt))) {
      throw new SecurityError('Potentially malicious content detected');
    }

    if (imageData) {
      const imageSizeBytes = (imageData.length * 3) / 4;
      if (imageSizeBytes > SERVER_CONFIG.MAX_IMAGE_SIZE_BYTES) {
        throw new ValidationError('Image too large');
      }
    }

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

    const result = await model.generateContentStream([sanitizedPrompt, imagePart]);

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

const UploadFileRequestSchema = z.object({
  file: z.string(),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
});

app.post('/api/upload-file', apiLimiter, async (req, res) => {
  try {
    const { file, mimeType } = UploadFileRequestSchema.parse(req.body);
    const result = await ai.uploadFile(file, { mimeType });
    res.json(result);
  } catch (error) {
    handleApiError(error, 'upload file', res);
  }
});

const PostProcessRequestSchema = z.object({
  base64SpriteSheet: z.string(),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  postProcessPrompt: z.string().min(1).max(5000),
  base64StyleImage: z.string().optional(),
  styleMimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']).optional(),
  temperature: z.number().min(0).max(1).optional(),
});

app.post('/api/post-process', apiLimiter, async (req, res) => {
  try {
    const {
      base64SpriteSheet,
      mimeType,
      postProcessPrompt,
      base64StyleImage,
      styleMimeType,
      temperature,
    } = PostProcessRequestSchema.parse(req.body);

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

const DetectObjectsRequestSchema = z.object({
  base64SpriteSheet: z.string(),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  detectionPrompt: z.string().min(1).max(5000),
});

app.post('/api/detect-objects', apiLimiter, async (req, res) => {
  try {
    const { base64SpriteSheet, mimeType, detectionPrompt } = DetectObjectsRequestSchema.parse(req.body);

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

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});