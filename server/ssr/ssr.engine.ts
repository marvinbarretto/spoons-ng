import { Express, Request, Response, NextFunction } from 'express';
import { CommonEngine } from '@angular/ssr/node';
import bootstrap from '../../src/main.server';
import { APP_BASE_HREF } from '@angular/common';

const commonEngine = new CommonEngine();

export function setupSsrRoute(
  app: Express,
  browserDistFolder: string,
  indexHtml: string
): void {
  app.get('**', (req: Request, res: Response, next: NextFunction) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    const environment = {
      strapiUrl: process.env['STRAPI_URL'] || 'http://localhost:1337',
      strapiToken: process.env['STRAPI_TOKEN'] || '',
      meiliSearchUrl: process.env['MEILISEARCH_URL'] || 'http://localhost:7700',
      meiliSearchKey: process.env['MEILISEARCH_KEY'] || '',
    };

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [
          { provide: APP_BASE_HREF, useValue: baseUrl },
          { provide: 'INITIAL_ENV', useValue: environment },
          {
            provide: 'INITIAL_AUTH_STATE',
            useValue: { user: null, token: null },
          },
        ],
      })
      .then((html) => {
        console.log('✅ SSR render success');
        res.send(html);
      })
      .catch((err) => {
        console.error('❌ SSR render failed:', err);
        res.status(500).send('SSR render error');
      });
  });
}
