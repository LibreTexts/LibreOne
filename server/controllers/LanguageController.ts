import errors from '../errors';
import { Language, sequelize } from '../models';
import { GetAllLanguagesQuery, LanguageIDParams } from '@server/types/languages';
import { Request, Response } from 'express';
import { Op } from 'sequelize';

export class LanguageController {
  /**
   * Retrieves a list of all available languages with optional searching.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async getAllLanguages(req: Request, res: Response): Promise<Response> {
    const { query } = req.query as unknown as GetAllLanguagesQuery;

    const fuzzyQuery = query ? `%${query}%` : null;
    const whereCriteria = query ? {
      [Op.or]: [
        { tag: { [Op.like]: fuzzyQuery } },
        { english_name: { [Op.like]: fuzzyQuery } }
      ]
    } : {};

    const { count, rows } = await Language.findAndCountAll({
      where: whereCriteria,
      order: sequelize.col('english_name'),
      attributes: ['id', 'tag', 'english_name']
    });

    return res.send({
      meta: {
        total: count
      },
      data: rows
    });
  }

  /**
   * Retrieves information about a specific language.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async getLanguage(req: Request, res: Response): Promise<Response> {
    const { langid } = req.params as unknown as LanguageIDParams;
    
    const language = await Language.findOne({
      where: { tag: langid },
      attributes: ['id', 'tag', 'english_name']
    });

    if (!language) {
      return errors.notFound(res);
    }

    return res.send({ data: language });
  }
}