import { Request, Response } from 'express';
import { Service, sequelize } from '../models';
import { getProductionURL, safeJSONParse } from '../helpers';
import errors from '../errors';
import { Op } from "sequelize";

export class ServiceController {
  /**
   * Creates a new Service definition.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async createService(req: Request, res: Response): Promise<Response> {
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
  public async getService(req: Request, res: Response): Promise<Response> {
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
  public async getAllServices(req: Request, res: Response): Promise<Response> {
    const offset = Number(req.query.offset);
    const limit = Number(req.query.limit);
    const query = req.query.query as string;

    const splitQueryParts = query?.split(" ");
    const fuzzyQueryParts = splitQueryParts?.map((p) => `%${p}%`);

    const queryCriteria = fuzzyQueryParts?.length
        ? {
            [Op.or]: [
                { service_Id: { [Op.like]: fuzzyQueryParts[0] } },
                { name: { [Op.like]: fuzzyQueryParts[0] } },
            ],
        }
        : {};


    const { count, rows } = await Service.findAndCountAll({
      ...(queryCriteria && {
        where: queryCriteria,
      }),
      offset,
      limit,
      order: sequelize.col('name'),
      // attributes: ['id', 'name', 'service_Id'], // temporary
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
  public async updateService(req: Request, res: Response): Promise<Response> {
    let { id } = req.params;
    const parsedServiceBody = safeJSONParse(req.body.body);
    if (!parsedServiceBody) {
      return errors.badRequest(res);
    }

    const [numUpdated] = await Service.update(JSON.parse(req.body.body), {
      where: { id: id },
    });
    if (numUpdated !== 1) {
      return errors.internalServerError(res);
    }
    return res.status(200).json({ message: "Service updated successfully" });
  }

  /**
   * Deletes a Service definition.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async deleteService(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    const serviceID = Number(id);
    const numDeleted = await Service.destroy({ where: { id: serviceID }});
    if (numDeleted < 1) {
      return errors.internalServerError(res);
    }
    return res.status(200);
  }
}