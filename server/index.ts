import 'dotenv/config';
import 'reflect-metadata';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import helmet from 'helmet';
import sirv from 'sirv';
import compression from 'compression';
import { createDevMiddleware, renderPage } from 'vike/server';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { connectDatabase } from './models';
import { APIRouter } from './routes';
import type { Request, Response, NextFunction } from 'express';
import { AuthController } from './controllers/AuthController';
import { UserController } from './controllers/UserController';
import { getProductionURL } from './helpers';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger/swagger.json'
import { PageContext } from '@renderer/types';
import rateLimit from "express-rate-limit";

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per windowMs
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const root = `${__dirname}/..`;

const app = express();
app.use(apiLimiter);
app.use(helmet.hidePoweredBy()); // TODO: Improve helmet utilization
app.use(compression());
app.use(bodyParser.json());
app.use(cookieParser());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

app.use('/api/v1', APIRouter);

app.use('/health', (_req, res) => {
  res.send({ healthy: true, msg: 'LibreOne is running.' });
});

await connectDatabase();

if (isProduction) {
  app.use(sirv('dist/client'));
} else {
  const { devMiddleware } = await createDevMiddleware({ root });
  app.use(devMiddleware);
}

const clientRouter = express.Router();
clientRouter.route('*').get(async (req: Request, res: Response, next: NextFunction) => {
  const userController = new UserController();
  const { expired, sessionInvalid, isAuthenticated, userUUID } = await AuthController.verifyClientAuthentication(req);
  let user;
  if (isAuthenticated && userUUID) {
    user = await userController.getUserInternal(userUUID, true);
  }

  const gatewayExcludePathPrefixes = ['/passwordrecovery', '/complete-registration'];
  const pathExcluded = !!gatewayExcludePathPrefixes.find((p) => req.path.includes(p));

  const triedGateway = process.env.NODE_ENV === 'development' ? true : req.cookies.one_tried_gateway;

  if (!isAuthenticated && !pathExcluded && !triedGateway) {
    const redirParams = new URLSearchParams({
      redirectURI: encodeURIComponent(req.url),
      tryGateway: 'true',
    });
    return res.redirect(307, `/api/v1/auth/login?${redirParams.toString()}`);
  }

  if(expired) {
    const redirParams = new URLSearchParams({
      redirectURI: encodeURIComponent(req.url),
    });
    return res.redirect(307, `/api/v1/auth/login?${redirParams.toString()}`);
  }

  if(sessionInvalid) {
    return res.redirect(307, '/api/v1/auth/logout');
  }

  const pageContextInit: PageContext = {
    isAuthenticated,
    urlOriginal: req.originalUrl,
    productionURL: getProductionURL(),
    ...(user && { user }),
  };

  const { httpResponse, redirectTo } = await renderPage(pageContextInit);
  const { statusCode, headers } = httpResponse || {};
  
  if (redirectTo) {
    return res.redirect(307, redirectTo);
  }
  if (!httpResponse) {
    return next();
  }

  res.status(statusCode);
  headers.forEach(([name, val]) => {
    res.setHeader(name, val);
  });
  httpResponse.pipe(res);
});
app.use('/', clientRouter);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`LibreOne API started on port ${PORT}.`);
});

export { server };
