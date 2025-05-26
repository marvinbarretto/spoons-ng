import { existsSync } from 'node:fs';
import dotenv from 'dotenv';

const localEnvPath = './.env';
if (existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
  if (process.env['VERBOSE_ENV']) {
    console.log('✅ Loaded .env from', localEnvPath);
    const keys = Object.keys(process.env).filter(k => k.includes('NEWS'));
    console.log('🧪 ENV KEYS:', keys);
    console.log('🧪 NEWS_CACHE_TTL_DAYS:', process.env['NEWS_CACHE_TTL_DAYS']);
    console.log('🔧 NEWS_CACHE_TTL (seconds):', Number(process.env['NEWS_CACHE_TTL_DAYS']) * 86400);
  }
}

// File: server.ts
import 'zone.js/node';

import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr/node';

import express, { NextFunction, Request, Response } from 'express';
import compression from 'compression';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { join } from 'node:path';

import { fileURLToPath } from 'node:url';
import { dirname } from 'path';
import bootstrap from './main.server';
import { generateInlineThemeCss, USER_THEME_TOKEN } from './libs/tokens/user-theme.token';
import cookieParser from 'cookie-parser';
import { getRedisClient } from '../server/redis/redis.client';
import newsRoute from '../server/routes/news.route';
import debugRoute from '../server/routes/debug.route';
import eventsRoute from '../server/routes/events.route';
import navRoute from '../server/routes/nav.route';
import devRoute from '../server/routes/dev.route';

// === Debug Utilities ===
function log(...args: unknown[]) {
  console.log('[SSR]', ...args);
}
function logError(...args: unknown[]) {
  console.error('[SSR:ERROR]', ...args);
}

export async function createServer(): Promise<express.Express> {
  // dotenv.config();
  // Explicitly resolve the env file relative to the root
  dotenv.config({ path: join(process.cwd(), '.env') });
  log('🔧 Environment loaded');

  console.log('🧪 TEST ENV:', process.env['STRAPI_URL']);
  console.log('🧪 ENV KEYS:', Object.keys(process.env).filter(k => k.includes('NEWS')));


  const app = express();
  app.set('trust proxy', 1);

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const distFolder = join(process.cwd(), 'dist/spoons/browser');
  const indexHtml = join(distFolder, 'index.csr.html');

  log(`📁 DIST folder: ${distFolder}`);
  log(`📄 index.csr.html: ${indexHtml}`);

  if (!existsSync(indexHtml)) logError('index.csr.html not found at:', indexHtml);
  if (!existsSync(distFolder)) logError('DIST folder not found at:', distFolder);
  if (!bootstrap) logError('Bootstrap module not found');

  const engine = new CommonEngine();

  // Middleware

  // 🧠 Log total server timing first - lets investigate how long SSR takes on these cold servers
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[⏱️ SSR] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    });
    next();
  });

  app.use(debugRoute);
  app.use(devRoute);
  app.use(compression());
  app.use(cors());
  app.use(cookieParser());
  // Using Redis now so rate limiting is not needed
  // app.use(rateLimit({
  //   windowMs: 15 * 60 * 1000,
  //   max: 100,
  //   message: 'Too many requests, try again later.',
  // }));

  // Test Redis
  app.get('/api/test-redis', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const redis = await getRedisClient();
      if (!redis) return next();
      await redis.set('hello', 'world');
      const value = await redis.get('hello');
      res.json({ message: 'Redis is working', value });
    } catch (err) {
      logError('Redis test route failed:', err);
      res.status(500).json({ error: 'Redis failure' });
    }
  });

  app.use(newsRoute);
  app.use(eventsRoute);
  app.use(navRoute);

  // Static assets
  app.get(
    '*.*',
    express.static(distFolder, { maxAge: '1y' })
  );

  // SSR route
  app.get('*', (req: Request, res: Response) => {
    const theme = req.cookies['userTheme'] ?? 'Default';
    const { protocol, headers, originalUrl, baseUrl } = req;
    const fullUrl = `${protocol}://${headers.host}${originalUrl}`;
    log(`[${req.method}] ${originalUrl}`);

    const environment = {
      strapiUrl: process.env['STRAPI_URL'] || 'http://localhost:1337',
      strapiToken: process.env['STRAPI_TOKEN'] || '',
    };

    engine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: fullUrl,
        publicPath: distFolder,
        providers: [
          { provide: APP_BASE_HREF, useValue: baseUrl },
          { provide: 'INITIAL_ENV', useValue: environment },
          { provide: 'INITIAL_AUTH_STATE', useValue: { user: null, token: null } },
          { provide: USER_THEME_TOKEN, useValue: theme },
        ],
      })
      .then((html) => {
        const inlineThemeCss = generateInlineThemeCss(theme);
        const themeScript = `<script>window.__SSR_THEME__ = '${theme}';</script>`;
        const injectedHtml = html.replace(
          '</head>',
          `${inlineThemeCss}\n${themeScript}\n</head>`
        );
        res.send(injectedHtml);
      })
      .catch((err) => {
        logError('SSR render failed:', err);
        res.status(500).send('SSR render error');
      });
  });

  return app;
}

// === Run the Server ===
if (import.meta.url === `file://${process.argv[1]}`) {
  createServer().then((app) => {
    const port = process.env['PORT'] || 4000;
    app.listen(port, () => {
      log(`✅ Angular SSR listening at http://localhost:${port}`);
    });
  });
}
