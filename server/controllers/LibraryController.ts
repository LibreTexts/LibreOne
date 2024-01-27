import axios from 'axios';
import { createHmac, randomBytes } from 'crypto';
import { GetParametersByPathCommand, SSMClient } from '@aws-sdk/client-ssm';
import { Op } from 'sequelize';
import { Application, UserApplication } from '../models';

type LibraryAPIRequestHeaders = {
  'X-Deki-Token': string;
  'X-Requested-With': string;
};

type CreateLibraryUserUserDataInput = {
  uuid: string;
  email: string;
  name: string;
};

export class LibraryController {
  private apiUsername: string;
  private defaultImagesURL = 'https://cdn.libretexts.net/DefaultImages';
  private libTokenPairPath: string;
  private ssm: SSMClient;

  constructor() {
    this.apiUsername = process.env.CXONE_API_USERNAME || 'LibreBot';
    this.libTokenPairPath = process.env.AWS_SSM_LIB_TOKEN_PAIR_PATH || '/production/libraries';
    this.ssm = new SSMClient({
      credentials: {
        accessKeyId: process.env.AWS_SSM_ACCESS_KEY || 'unknown',
        secretAccessKey: process.env.AWS_SSM_SECRET_KEY || 'unknown',
      },
      region: process.env.AWS_SSM_REGION,
    });
  }

  public static getLibraryIdentifierFromAppURL(url: string) {
    const libreRegex = /^(?:https?:\/\/)?([^.]+)\.libretexts\.org/i;
    const matches = url.match(libreRegex);
    if (Array.isArray(matches) && matches.length > 1) {
      return matches[1];
    }
    return 'unknown';
  }

  private doubleEncodeURIComponent(str: string) {
    return encodeURIComponent(encodeURIComponent(str));
  }

  /**
   * Retrieves the token pair requried to interact with a library's API.
   */
  private async getLibraryTokenPair(lib: string) {
    const basePath = this.libTokenPairPath.endsWith('/')
      ? this.libTokenPairPath
      : `${this.libTokenPairPath}/`;
    const pairResponse = await this.ssm.send(new GetParametersByPathCommand({
      Path: `${basePath}${lib}`,
      MaxResults: 10,
      Recursive: true,
      WithDecryption: true,
    }));
    if (pairResponse.$metadata.httpStatusCode !== 200) {
      console.error({
        msg: 'Error retrieving library token pair!',
        lib,
        metadata: pairResponse.$metadata,
      });
      throw new Error('Error retrieving library token pair.');
    }
    if (!pairResponse.Parameters) {
      console.error({
        msg: 'No results returned during library token pair retrieval!',
        lib,
      });
      throw new Error('Error retrieving library token pair.');
    }
    const libKey = pairResponse.Parameters.find((p) => p.Name?.includes(`${lib}/key`));
    const libSec = pairResponse.Parameters.find((p) => p.Name?.includes(`${lib}/secret`));
    if (!libKey?.Value || !libSec?.Value) {
      console.error({ msg: 'Requried parameter not found during library token pair retrieval!' });
      throw new Error('Error retrieving library token pair.');
    }
    return {
      key: libKey.Value,
      secret: libSec.Value,
    };
  }

  /**
   * Generates the set of request headers required for interacting with a library's API,
   * including the API token.
   */
  private async generateAPIRequestHeaders(lib: string): Promise<LibraryAPIRequestHeaders> {
    const keyPair = await this.getLibraryTokenPair(lib);
    const epoch = Math.floor(Date.now() / 1000);
    const hmac = createHmac('sha256', keyPair.secret);
    hmac.update(`${keyPair.key}${epoch}=${this.apiUsername}`);
    return {
      'X-Deki-Token': `${keyPair.key}_${epoch}_=${this.apiUsername}_${hmac.digest('hex')}`,
      'X-Requested-With': 'XMLHttpRequest',
    };
  }

  /**
   * Adds a library user to a group.
   */
  public async createLibraryGroupUser(lib: string, libUserID: string, groupID: string, headers?: LibraryAPIRequestHeaders) {
    const reqHeaders = headers || await this.generateAPIRequestHeaders(lib);
    try {
      await axios.post(
        `https://${lib}.libretexts.org/@api/deki/groups/${groupID}/users?dream.out.format=json`,
        `
          <users>
            <user id="${libUserID}" />
          </users>
        `,
        {
          headers: {
            ...reqHeaders,
            'Content-Type': 'application/xml; charset=utf-8',
          },
        },
      );
    } catch (e) {
      console.warn({
        msg: 'Error adding library user to group',
        lib,
        libUserID,
        groupID,
        error: e,
      });
      return false;
    }
    return true;
  }

  /**
   * Creates a new library user or reactivates their existing account.
   */
  public async createOrActivateLibraryUser(lib: string, userData: CreateLibraryUserUserDataInput, headers?: LibraryAPIRequestHeaders) {
    const reqHeaders = headers || await this.generateAPIRequestHeaders(lib);
    const existingUser = await this.getLibraryUser(lib, userData.uuid, reqHeaders);
    if (existingUser) {
      if (existingUser.status === 'inactive') {
        await this.activateLibraryUser(lib, userData.uuid, reqHeaders);
      }
      return existingUser['@id'];
    }

    const userDataBody = `
      <user>
        <username>${userData.uuid}</username>
        <email>${userData.email}</email>
        <fullname>${userData.name}</fullname>
        <status>active</status>
        <license.seat>true</license.seat>
        <service.authentication id="3" />
        <permissions.user>
          <role>Viewer</role>
        </permissions.user>
      </user>
    `;
    const { data: newUserData } = await axios.post(
      `https://${lib}.libretexts.org/@api/deki/users?dream.out.format=json`,
      userDataBody,
      {
        headers: {
          ...reqHeaders,
          'Content-Type': 'application/xml; charset=utf-8',
        },
      },
    );
    console.info({
      msg: 'Library user created',
      lib,
      uuid: userData.uuid,
    });
    return newUserData['@id'];
  }

  /**
   * Retrieves all known groups in a library.
   */
  public async getLibraryGroups(lib: string, headers?: LibraryAPIRequestHeaders): Promise<{ id: string; name: string; role: string }[]> {
    const reqHeaders = headers || await this.generateAPIRequestHeaders(lib);
    try {
      const groupsParams = new URLSearchParams({ 'dream.out.format': 'json' });
      const { data: groupsData } = await axios.get(
        `https://${lib}.libretexts.org/@api/deki/groups?${groupsParams.toString()}`,
        { headers: reqHeaders },
      );
      if (groupsData['@count'] > 0 && groupsData.group) {
        const groups = (groupsData.group.length ? groupsData.group : [groupsData.group]).map((g) => ({
          id: g['@id'],
          name: g['groupname'],
          role: g['permissions.group'].role['#text'],
        }));
        return groups;
      }
    } catch (e) {
      console.error({
        msg: 'Error retrieving library groups!',
        lib,
        error: e,
      });
    }
    return [];
  }

  /**
   * Retrieves a library user.
   */
  public async getLibraryUser(lib: string, uuid: string, headers?: LibraryAPIRequestHeaders) {
    const reqHeaders = headers || await this.generateAPIRequestHeaders(lib);
    try {
      const { data: userData } = await axios.get(
        `https://${lib}.libretexts.org/@api/deki/users/=${this.doubleEncodeURIComponent(uuid)}?dream.out.format=json`,
        { headers: reqHeaders },
      );
      return userData;
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        return null;
      }
      throw e;
    }
  }

  /**
   * Helper to submit any update allowed to a library user.
   */
  private async updateLibraryUser(lib: string, uuid: string, update: string, headers?: LibraryAPIRequestHeaders) {
    const reqHeaders = headers || await this.generateAPIRequestHeaders(lib);
    const { data: resData } = await axios.put(
      `https://${lib}.libretexts.org/@api/deki/users/=${this.doubleEncodeURIComponent(uuid)}?dream.out.format=json`,
      update,
      {
        headers: {
          ...reqHeaders,
          'Content-Type': 'application/xml; charset=utf-8',
        },
      },
    );
    return resData;
  }

  /**
   * Updates a library user's email address.
   */
  public async updateLibraryUserEmail(lib: string, uuid: string, newEmail: string, headers?: LibraryAPIRequestHeaders) {
    const reqHeaders = headers || await this.generateAPIRequestHeaders(lib);
    const existingUser = await this.getLibraryUser(lib, uuid, reqHeaders);
    if (!existingUser) {
      console.info({
        msg: 'Library user did not exist to update email.',
        lib,
        uuid,
      });
      return true;
    }

    await this.updateLibraryUser(
      lib,
      uuid,
      `
        <user>
          <email>${newEmail}</email>
        </user>
      `,
      headers,
    );
    console.info({
      msg: 'Library user email updated.',
      lib,
      uuid,
    });
    return true;
  }

  /**
   * Updates a library user's full name.
   */
  public async updateLibraryUserName(lib: string, uuid: string, newName: string, headers?: LibraryAPIRequestHeaders) {
    const reqHeaders = headers || await this.generateAPIRequestHeaders(lib);
    const existingUser = await this.getLibraryUser(lib, uuid, reqHeaders);
    if (!existingUser) {
      console.info({
        msg: 'Library user did not exist to update full name.',
        lib,
        uuid,
      });
      return true;
    }

    await this.updateLibraryUser(
      lib,
      uuid,
      `
        <user>
          <fullname>${newName}</fullname>
        </user>
      `,
      headers,
    );
    console.info({
      msg: 'Library user full name updated.',
      lib,
      uuid,
    });
    return true;
  }

  /**
   * Sets a library user to 'active' status. Assumes that the user already exists.
   */
  private async activateLibraryUser(lib: string, uuid: string, headers?: LibraryAPIRequestHeaders) {
    const reqHeaders = headers || await this.generateAPIRequestHeaders(lib);
    await this.updateLibraryUser(
      lib,
      uuid,
      `
        <user>
          <status>active</status>
        </user>
      `,
      reqHeaders,
    );
    console.info({
      msg: 'Library user activated.',
      lib,
      uuid,
    });
    return true;
  }

  /**
   * Sets a library user to 'inactive' status. Assumes that the user actually exists.
   */
  public async deactivateLibraryUser(lib: string, uuid: string, headers?: LibraryAPIRequestHeaders) {
    const reqHeaders = headers || await this.generateAPIRequestHeaders(lib);
    const userData = await this.getLibraryUser(lib, uuid, reqHeaders);
    if (!userData) {
      console.info({
        msg: 'Library user did not exist to deactivate.',
        lib,
        uuid,
      });
      return true;
    }
    if (userData.status === 'inactive') {
      console.info({
        msg: 'Library user already deactivated.',
        lib,
        uuid,
      });
      return true;
    }
    await this.updateLibraryUser(
      lib,
      uuid,
      `
        <user>
          <status>inactive</status>
        </user>
      `,
      reqHeaders,
    );
    console.info({
      msg: 'Library user deactivated.',
      lib,
      uuid,
    });
    return true;
  }

  /**
   * Updates a library user's username. Assumes that the user actually exists and requires the
   * library user ID rather than the central UUID. Intended only for use during LibreOne migration.
   */
  public async updateLibraryUserUsername(lib: string, id: string, username: string, headers?: LibraryAPIRequestHeaders) {
    const reqHeaders = headers || await this.generateAPIRequestHeaders(lib);
    const { data: resData } = await axios.put(
      `https://${lib}.libretexts.org/@api/deki/users/${id}?dream.out.format=json`,
      `
        <user>
          <username>${username}</username>
        </user>
      `,
      {
        headers: {
          ...reqHeaders,
          'Content-Type': 'application/xml; charset=utf-8',
        },
      },
    );
    return resData;
  }

  /**
   * Converts a library user to use external authentication. Assumes that the user actually exists
   * and requires the library user ID rather then the central UUID.
   */
  public async convertLibraryUserToExternalAuth(lib: string, id: string, serviceID: string, headers?: LibraryAPIRequestHeaders) {
    const reqHeaders = headers || await this.generateAPIRequestHeaders(lib);
    const { data: resData } = await axios.put(
      `https://${lib}.libretexts.org/@api/deki/users/${id}?dream.out.format=json`,
      `
        <user>
          <service.authentication id="${serviceID}" />
        </user>
      `,
      {
        headers: {
          ...reqHeaders,
          'Content-Type': 'application/xml; charset=utf-8',
        },
      },
    );
    return resData;
  }

}