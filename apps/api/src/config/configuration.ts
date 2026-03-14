export default () => ({
  port: parseInt(process.env['API_PORT'] ?? '3001', 10),
  corsOrigin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000',
  database: {
    url: process.env['DATABASE_URL'],
  },
  redis: {
    url: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
  },
  jwt: {
    secret: process.env['JWT_SECRET'] ?? 'change-me-in-production',
    expiresIn: process.env['JWT_EXPIRES_IN'] ?? '7d',
  },
  ai: {
    provider: process.env['AI_CLASSIFIER_PROVIDER'] ?? 'anthropic',
  },
  anthropic: {
    apiKey: process.env['ANTHROPIC_API_KEY'],
    model: process.env['ANTHROPIC_MODEL'] ?? 'claude-opus-4-6',
  },
  openai: {
    apiKey: process.env['OPENAI_API_KEY'],
    model: process.env['OPENAI_MODEL'] ?? 'gpt-4o-mini',
  },
  whatsapp: {
    provider: process.env['WHATSAPP_PROVIDER'] ?? 'stub',
    baseUrl: process.env['WHATSAPP_PROVIDER_BASE_URL'],
    apiKey: process.env['WHATSAPP_PROVIDER_API_KEY'],
  },
});
