import express from 'express';
import { apiUsersRouter } from './apiusers';
import { authRouter } from './auth';
import { organizationsRouter } from './organizations';
import { permissionsRouter } from './permissions';
import { servicesRouter } from './services';
import { systemsRouter } from './systems';
import { usersRouter } from './users';

const APIRouter = express.Router();

APIRouter.use('/api-users', apiUsersRouter);
APIRouter.use('/auth', authRouter);
APIRouter.use('/organizations', organizationsRouter);
APIRouter.use('/permissions', permissionsRouter);
APIRouter.use('/services', servicesRouter);
APIRouter.use('/systems', systemsRouter);
APIRouter.use('/users', usersRouter);

export {
  APIRouter,
};
