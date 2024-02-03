import 'dotenv/config';
import 'reflect-metadata';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import helmet from 'helmet';
import sirv from 'sirv';
import * as vite from 'vite';
import compression from 'compression';
import { renderPage } from 'vite-plugin-ssr';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { connectDatabase } from './models';
import { APIRouter } from './routes';
import type { Request, Response, NextFunction } from 'express';
import type { PageContextInitCustom } from '@renderer/types';
import { AuthController } from './controllers/AuthController';
import { UserController } from './controllers/UserController';
import { getProductionURL } from './helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const root = `${__dirname}/..`;

const app = express();
app.use(helmet.hidePoweredBy()); // TODO: Improve helmet utilization
app.use(compression());
app.use(bodyParser.json());
app.use(cookieParser());

app.use('/api/v1', APIRouter);

app.use('/health', (_req, res) => {
  res.send({ healthy: true, msg: 'LibreOne is running.' });
});

await connectDatabase();

if (isProduction) {
  app.use(sirv('dist/client'));
} else {
  const viteDevMiddleware = (
    await vite.createServer({
      root,
      server: { middlewareMode: true },
    })
  ).middlewares;
  app.use(viteDevMiddleware);
}

const clientRouter = express.Router();
clientRouter.route('*').get(async (req: Request, res: Response, next: NextFunction) => {
  const userController = new UserController();
  const { expired, isAuthenticated, userUUID } = await AuthController.verifyClientAuthentication(req);
  let user;
  if (isAuthenticated && userUUID) {
    user = await userController.getUserInternal(userUUID);
  }

  const gatewayExcludePathPrefixes = ['/passwordrecovery', '/complete-registration'];
  const pathExcluded = !!gatewayExcludePathPrefixes.find((p) => req.path.includes(p));
  if (!isAuthenticated && !pathExcluded && !req.cookies.one_tried_gateway) {
    const redirParams = new URLSearchParams({
      redirectURI: encodeURIComponent(req.url),
      tryGateway: 'true',
    });
    return res.redirect(307, `/api/v1/auth/login?${redirParams.toString()}`);
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
  httpResponse.pipe(res);
});
app.use('/', clientRouter);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`LibreOne API started on port ${PORT}.`);
});

export { server };
