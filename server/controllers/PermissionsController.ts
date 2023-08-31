import { Request, Response } from 'express';
import { CheckPermissionBody } from '../types/permissions';
import { Organization, OrganizationSystem, User } from '../models';
import errors from '../errors';

export enum PermissionsActionsEnum {
  READ = 'READ',
  WRITE = 'WRITE',
}
export enum PermissionsResourcesEnum {
  AccessRequest = 'AccessRequest',
  APIUser = 'APIUser',
  Application = 'Application',
  Organization = 'Organization',
  OrganizationSystem = 'OrganizationSystem',
  Service = 'Service',
  User = 'User',
  VerificationRequest = 'VerificationRequest',
}
export enum ReservedRoleEnum {
  super_admin = 'super_admin',
  omnipotent = 'omnipotent',
}
export enum UserOrganizationAdminRoleEnum {
  org_admin = 'org_admin',
  org_sys_admin = 'org_sys_admin',
}

export type PermissionsResource = keyof typeof PermissionsResourcesEnum;
export type PermissionsAction = keyof typeof PermissionsActionsEnum;
export type ReservedRole = keyof typeof ReservedRoleEnum;
export type UserOrganizationAdminRole = keyof typeof UserOrganizationAdminRoleEnum;

export class PermissionsController {
  private isOrganizationAdministrator(user: User, organization_id: number): boolean {
    const foundOrganization = user.get('organizations')?.find((org) => org.id === organization_id);
    return foundOrganization ? foundOrganization.get('UserOrganization').get('admin_role') === 'org_admin' : false;
  }

  private async isOrganizationSystemAdministrator(user: User, system_id: number): Promise<boolean> {
    const foundSystem = await OrganizationSystem.findOne({
      where: { id: system_id },
      include: [{
        model: Organization,
        attributes: ['id'],
      }],
    });
    if (!foundSystem) {
      return false;
    }

    const systemOrganizations: number[] = foundSystem.get('organizations')?.map((org) => org.id) || [];
    const userOrganizationRoles = user.get('organizations')?.map((org) => ({
      id: org.id,
      role: org.get('UserOrganization').get('admin_role'),
    })) || [];
    const hasOrgSysAdminRole = systemOrganizations.some((org) => {
      const foundOrg = userOrganizationRoles.find((userOrg) => userOrg.id === org);
      return foundOrg ? foundOrg.role === 'org_sys_admin' : false;
    });
    return hasOrgSysAdminRole;
  }

  private isSuperAdministrator(user: User): boolean {
    const foundLibreTexts = user.get('organizations')?.find((org) => org.name === 'LibreTexts');
    return foundLibreTexts ? foundLibreTexts.get('UserOrganization').get('admin_role') === 'super_admin' : false;
  }

  private isOmnipotent(user: User): boolean {
    const foundLibreTexts = user.get('organizations')?.find((org) => org.name === 'LibreTexts');
    return foundLibreTexts ? foundLibreTexts.get('UserOrganization').get('admin_role') === 'omnipotent' : false;
  }

  public async checkPermission(req: Request, res: Response): Promise<Response> {
    const { userUUID, resourceType, resourceID, action } = req.body as CheckPermissionBody;

    let hasPermission = false;
    const foundUser = await User.findOne({
      where: { uuid: userUUID },
      include: [{
        model: Organization,
        attributes: ['id', 'name', 'system_id'],
        through: { attributes: ['admin_role'] },
      }],
    });
    if (!foundUser) {
      return errors.notFound(res);
    }

    if (action === PermissionsActionsEnum.READ) {
      switch (resourceType) {
        case 'AccessRequest':
        case 'APIUser':
          hasPermission = this.isSuperAdministrator(foundUser) || this.isOmnipotent(foundUser);
          break;
        case 'Application':
          hasPermission = true; // all roles
          break;
        case 'Organization':
          hasPermission = true; // all roles
          break;
        case 'Service':
          hasPermission = this.isOmnipotent(foundUser);
          break;
        case 'OrganizationSystem':
          hasPermission = true; // all roles
          break;
        case 'User':
          hasPermission = true; // all roles
          break;
        case 'VerificationRequest':
          hasPermission = this.isSuperAdministrator(foundUser) || this.isOmnipotent(foundUser);
          break;
      }
    } else if (action === PermissionsActionsEnum.WRITE) {
      switch (resourceType) {
        case 'AccessRequest':
          hasPermission = this.isSuperAdministrator(foundUser) || this.isOmnipotent(foundUser);
          break;
        case 'APIUser':
          hasPermission = this.isOmnipotent(foundUser);
          break;
        case 'Application':
          hasPermission = this.isOmnipotent(foundUser);
          break;
        case 'Organization':
          if (!resourceID) { // create new
            hasPermission = this.isSuperAdministrator(foundUser) || this.isOmnipotent(foundUser);
            break;
          }
          hasPermission = this.isOrganizationAdministrator(foundUser, Number(resourceID)) || this.isSuperAdministrator(foundUser) || this.isOmnipotent(foundUser);
          if (!hasPermission) {
            const foundOrg = await Organization.findOne({ where: { id: Number(resourceID) }});
            const foundSystemID = foundOrg?.get('system_id');
            if (foundSystemID) {
              hasPermission = await this.isOrganizationSystemAdministrator(foundUser, foundSystemID);
            }
          }
          break;
        case 'Service':
          hasPermission = this.isOmnipotent(foundUser);
          break;
        case 'OrganizationSystem':
          hasPermission = this.isSuperAdministrator(foundUser) || this.isOmnipotent(foundUser);
          break;
        case 'User':
          if (!resourceID) { // create new
            hasPermission = this.isSuperAdministrator(foundUser) || this.isOmnipotent(foundUser);
            break;
          }
          hasPermission = resourceID === userUUID || this.isSuperAdministrator(foundUser) || this.isOmnipotent(foundUser);
          break;
        case 'VerificationRequest':
          hasPermission = this.isSuperAdministrator(foundUser) || this.isOmnipotent(foundUser);
          break;
      }
    }

    return res.send({ data: { effect: hasPermission ? 'ALLOW' : 'DENY' } });
  }
}
