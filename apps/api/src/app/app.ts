import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { env } from '../config/env.js';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { sessionRoutes } from '../modules/session/session.routes.js';
import { roomRoutes } from '../modules/room/room.routes.js';
import { streamRoutes } from '../modules/stream/stream.routes.js';

export async function buildApp() {
  const isProd = env.NODE_ENV === 'production';
  const app = Fastify({
    logger: isProd
      ? { level: 'info' }
      : {
          level: 'debug',
          transport: { target: 'pino-pretty', options: { colorize: true } },
        },
  });

  // ─── Security ──────────────────────────────────────────────────────────────

  await app.register(helmet, {
    contentSecurityPolicy: false, // Discord Activity iframes need flexibility
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  await app.register(rateLimit, {
    global: true,
    max: 60,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      error: 'RATE_LIMIT',
      message: 'Muitas requisições. Tente novamente em breve.',
      statusCode: 429,
    }),
  });

  // ─── Routes ────────────────────────────────────────────────────────────────

  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(sessionRoutes, { prefix: '/session' });
  await app.register(roomRoutes, { prefix: '/room' });
  await app.register(streamRoutes, { prefix: '/stream' });

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // ─── Global error handler ──────────────────────────────────────────────────

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error, url: request.url }, 'Unhandled error');
    reply.status(error.statusCode ?? 500).send({
      error: 'INTERNAL_ERROR',
      message:
        env.NODE_ENV === 'production'
          ? 'Ocorreu um erro interno. Tente novamente.'
          : error.message,
      statusCode: error.statusCode ?? 500,
    });
  });

  return app;
}
