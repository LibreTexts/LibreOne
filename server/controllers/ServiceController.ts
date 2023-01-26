import { Request, Response } from 'express';
import { Service, sequelize } from '../models';
import { getProductionURL, safeJSONParse } from '../helpers';
import errors from '../errors';

/**
 * Creates a new Service definition.
 *
 * @param req - Incoming API request.
 * @param res - Outgoing API response.
 * @returns The fulfilled API response.
 */
export async function createService(req: Request, res: Response): Promise<Response> {
  const parsedServiceBody = safeJSONParse(req.body.body);
  if (!parsedServiceBody) {
    return errors.badRequest(res);
  }
  const newService = await Service.create(req.body);
  const resourceURL = `${getProductionURL()}/api/v1/services/${newService.get('id')}`;
  return res.status(201).set('Location', resourceURL).send({
    data: newService,
  });
}

/**
 * Retrieves a single Service definition.
 *
 * @param req - Incoming API request.
 * @param res - Outgoing API response.
 * @returns The fulfilled API response.
 */
export async function getService(req: Request, res: Response): Promise<Response> {
  const { id } = req.params;
  const serviceID = Number(id);
  const foundService = await Service.findByPk(serviceID);
  if (!foundService) {
    return errors.notFound(res);
  }

  return res.send({
    data: foundService,
  });
}

/**
 * Retrieves all known Service definitions.
 *
 * @param req - Incoming API request.
 * @param res - Outgoing API response.
 * @returns The fulfilled API response.
 */
export async function getAllServices(req: Request, res: Response): Promise<Response> {
  const offset = Number(req.query.offset);
  const limit = Number(req.query.limit);
  const { count, rows } = await Service.findAndCountAll({
    offset,
    limit,
    order: sequelize.col('name'),
    attributes: ['id', 'name', 'service_Id'],
  });
  return res.send({
    meta: {
      offset,
      limit,
      total: count,
    },
    data: rows,
  });
}

/**
 * Updates a Service definition.
 *
 * @param req - Incoming API request.
 * @param res - Outgoing API response.
 * @returns The fulfilled API response.
 */
export async function updateService(req: Request, res: Response): Promise<Response> {
  const { id } = req.params;
  const serviceID = Number(id);
  const parsedServiceBody = safeJSONParse(req.body.body);
  if (!parsedServiceBody) {
    return errors.badRequest(res);
  }
  const [numUpdated] = await Service.update(req.body, {
    where: { id: serviceID },
  });
  if (numUpdated !== 1) {
    return errors.internalServerError(res);
  }
  return res.status(200);
}

/**
 * Deletes a Service definition.
 *
 * @param req - Incoming API request.
 * @param res - Outgoing API response.
 * @returns The fulfilled API response.
 */
export async function deleteService(req: Request, res: Response): Promise<Response> {
  const { id } = req.params;
  const serviceID = Number(id);
  const numDeleted = await Service.destroy({ where: { id: serviceID }});
  if (numDeleted < 1) {
    return errors.internalServerError(res);
  }
  return res.status(200);
}
