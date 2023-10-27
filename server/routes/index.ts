import express from 'express';
import { apiUsersRouter } from './apiusers';
import { applicationsRouter } from './applications';
import { authRouter } from './auth';
import { licensesRouter } from './licenses';
import { organizationsRouter } from './organizations';
import { permissionsRouter } from './permissions';
import { servicesRouter } from './services';
import { organizationSystemsRouter } from './organizationsystems';
import { usersRouter } from './users';
import { verificationRequestsRouter } from './verificationrequests';

const APIRouter = express.Router();

APIRouter.use('/api-users', apiUsersRouter);
APIRouter.use('/applications', applicationsRouter);
APIRouter.use('/auth', authRouter);
APIRouter.use('/licenses', licensesRouter);
APIRouter.use('/organizations', organizationsRouter);
APIRouter.use('/organization-systems', organizationSystemsRouter);
APIRouter.use('/permissions', permissionsRouter);
APIRouter.use('/services', servicesRouter);
APIRouter.use('/users', usersRouter);
APIRouter.use('/verification-requests', verificationRequestsRouter);

export {
  APIRouter,
};
