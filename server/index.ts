import 'dotenv/config';
import 'reflect-metadata';
import express from 'express';
import helmet from 'helmet';
import sirv from 'sirv';
import vite from 'vite';
import compression from 'compression'
import { renderPage } from 'vite-plugin-ssr'
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { connectDatabase } from './models';
import { initMailSender } from './controllers/MailController';
import { APIRouter } from './routes';
import type { Request, Response, NextFunction } from 'express';
import type { PageContextInitCustom } from '@renderer/types';
import { verifyClientAuthentication } from './controllers/AuthController';
import { getUserInternal } from './controllers/UserController';
import { getProductionURL } from './helpers';

const isProduction = process.env.NODE_ENV === 'production';
const root = `${__dirname}/..`;

/**
 * Connects to the database and initializes a server instance.
 */
async function startServer() {
  const app = express();
  app.use(helmet.hidePoweredBy()); // TODO: Improve helmet utilization
  app.use(compression());
  app.use(bodyParser.json());
  app.use(cookieParser());

  app.use('/api/v1', APIRouter);

  await connectDatabase();
  initMailSender();

  if (isProduction) {
    app.use(sirv(`${root}/dist/client`));
  } else {
    const viteDevMiddleware = (
      await vite.createServer({
        root,
        server: { middlewareMode: true }
      })
    ).middlewares;
    app.use(viteDevMiddleware);
  }

  const clientRouter = express.Router();
  clientRouter.route('*').get(async (req: Request, res: Response, next: NextFunction) => {
    const { expired, isAuthenticated, userUUID } = await verifyClientAuthentication(req);
    let user;
    if (isAuthenticated && userUUID) {
      user = await getUserInternal(userUUID);
    }
    const pageContextInit: PageContextInitCustom = {
      isAuthenticated,
      urlOriginal: req.originalUrl,
      expiredAuth: expired,
      productionURL: getProductionURL(),
      ...(user && { user }),
    };
    const { httpResponse, redirectTo } = await renderPage(pageContextInit);
    if (redirectTo) {
      return res.redirect(307, redirectTo);
    }
    if (!httpResponse) {
      return next();
    }
    const { body, statusCode, contentType, earlyHints } = httpResponse;
    if (res.writeEarlyHints) {
      res.writeEarlyHints({ link: earlyHints.map((e) => e.earlyHintLink) });
    }
    res.status(statusCode).type(contentType).send(body);
  });
  app.use('/', clientRouter);

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`LibreOne API started on port ${PORT}.`);
  });
}

startServer();
