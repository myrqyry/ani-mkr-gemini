const requiredEnvVars = [
  'GEMINI_API_KEY',
  'NODE_ENV'
];

export const validateEnvironment = () => {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};
