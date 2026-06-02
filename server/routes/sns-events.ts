import express from 'express';
import { SnsEventController } from '@server/controllers/SnsEventController';
import { catchInternal } from '@server/helpers';

const snsEventsRouter = express.Router();
const controller = new SnsEventController();

// SNS sends `Content-Type: text/plain; charset=UTF-8` by default — parse any content type as JSON.
const parseAnyAsJson = express.json({ type: () => true });

snsEventsRouter.route('/ses-events').post(
  parseAnyAsJson,
  catchInternal((req, res) => controller.ingest(req, res)),
);

export { snsEventsRouter };
