import express from 'express';
import { authRouter } from './auth';
import { organizationsRouter } from './organizations';
import { servicesRouter } from './services';
import { systemsRouter } from './systems';
import { usersRouter } from './users';

const APIRouter = express.Router();

APIRouter.use('/auth', authRouter);
APIRouter.use('/organizations', organizationsRouter)
APIRouter.use('/services', servicesRouter);
APIRouter.use('/systems', systemsRouter);
APIRouter.use('/users', usersRouter);

export {
  APIRouter
};
