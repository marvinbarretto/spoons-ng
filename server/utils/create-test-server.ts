import cookieParser from 'cookie-parser';
import express from 'express';
import navRouter from '../routes/nav.route';
import eventsRouter from '../routes/events.route';

export async function createTestServer() {
  const app = express();
  app.use(cookieParser());
  app.use(navRouter);
  app.use(eventsRouter);

  app.use((req, res, next) => {
    console.log(`[TEST] ${req.method} ${req.url}`);
    next();
  });

  return app;
}
