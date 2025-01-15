import { Application, User } from "@server/models";
import axios from "axios";
import { SignJWT } from "jose";
import { Op } from "sequelize";

export class LifecycleController {
  constructor() {}

  /**
   * Provision a user to all available applications that have a user_provisioning_url and jwt_secret
   * @param user - User object
   * @returns void
   */
  async ProvisionUser(user: User) {
    try {
      const appsToProvision = await Application.findAll({
        where: {
          user_provisioning_url: {
            [Op.not]: null,
          },
          jwt_secret: {
            [Op.not]: null,
          },
        },
      });

      const promises = appsToProvision.map(async (app) => {
        const userData = {
          central_identity_id: user.uuid,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          user_type: user.user_type,
          time_zone: user.time_zone,
          role: user.user_type ?? "student",
          verify_status: user.verify_status,
          ...(user.avatar && { avatar: user.avatar }),
        };

        return this._makeRequest(
          "POST",
          app.user_provisioning_url,
          app.jwt_secret,
          { userData }
        );
      });

      const provisioningResults = await Promise.allSettled(promises);
      provisioningResults.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error({
            msg: "Error provisioning user application!",
            error: result.reason,
            application_id: appsToProvision[index].id,
            user_id: user.uuid,
          });
        }
      });
    } catch (err) {
      console.error({
        msg: "Error provisioning user applications!",
        error: err,
      });
    }
  }

  /**
   * Deprovision a user from all available applications that have a user_deprovisioning_url and jwt_secret
   * @param user - User object
   * @returns void
   */
  async DeprovisionUser(user: User) {
    try {
      const appsToDeprovision = await Application.findAll({
        where: {
          user_deprovisioning_url: {
            [Op.not]: null,
          },
          jwt_secret: {
            [Op.not]: null,
          },
        },
      });

      const promises = appsToDeprovision.map(async (app) => {
        const userData = {
          central_identity_id: user.uuid,
        };

        return this._makeRequest(
          "DELETE",
          app.user_deprovisioning_url,
          app.jwt_secret,
          { userData }
        );
      });

      const deprovisioningResults = await Promise.allSettled(promises);
      deprovisioningResults.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error({
            msg: "Error deprovisioning user application!",
            error: result.reason,
            application_id: appsToDeprovision[index].id,
            user_id: user.uuid,
          });
        }
      });
    } catch (err) {
      console.error({
        msg: "Error deprovisioning user applications!",
        error: err,
      });
    }
  }

  /**
   * Update a user in all available applications that have a user_update_url and jwt_secret
   * @param user - User object
   * @returns void
   */
  async UpdateUser(user: User) {
    try {
      const appsToUpdate = await Application.findAll({
        where: {
          user_update_url: {
            [Op.not]: null,
          },
          jwt_secret: {
            [Op.not]: null,
          },
        },
      });

      const promises = appsToUpdate.map(async (app) => {
        const userData = {
          central_identity_id: user.uuid,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          user_type: user.user_type,
          time_zone: user.time_zone,
          role: user.user_type ?? "student",
          verify_status: user.verify_status,
          ...(user.avatar && { avatar: user.avatar }),
        };

        return this._makeRequest("PATCH", app.user_update_url, app.jwt_secret, {
          userData,
        });
      });

      const updateResults = await Promise.allSettled(promises);
      updateResults.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error({
            msg: "Error updating user application!",
            error: result.reason,
            application_id: appsToUpdate[index].id,
            user_id: user.uuid,
          });
        }
      });
    } catch (err) {
      console.error({
        msg: "Error updating user applications!",
        error: err,
      });
    }
  }

  private async _makeRequest(
    method: "POST" | "GET" | "PUT" | "DELETE" | "PATCH",
    url: string,
    jwt_secret: string,
    data: Record<string, any>
  ) {
    try {
      const encoded = new TextEncoder().encode(jwt_secret);
      const jwt = await new SignJWT(data)
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(encoded);

      const headers = {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        Authorization: `Bearer ${jwt}`,
        Origin:
          process.env.PRODUCTION_DOMAIN ??
          process.env.DOMAIN ??
          "one.libretexts.org",
      };

      return axios({
        method,
        url,
        data,
        headers,
      });
    } catch (err) {
      console.error({
        msg: `Error making ${method} request to ${url}`,
        error: err,
      });
    }
  }
}
