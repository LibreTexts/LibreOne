import errors from '../errors';
import { User, ApplicationLicense, AccessCode, UserLicense, Organization, OrganizationLicenseEntitlement, sequelize } from '../models';
import { GetAllLicensesQuery, LicenseIDParams } from '@server/types/licenses';
import { Request, Response } from 'express';
import { Op } from 'sequelize';

export class AppLicenseController {

  /**
   * Retrieves a list of all the licenses the user has access to
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async getAllUserLicenses(req: Request, res: Response): Promise<Response> {
    console.log("In getAllUserLicenses API");

    try {
        const { userId } = req.params;

        const userLicenses = await UserLicense.findAll({
            attributes: ['uuid', 'original_purchase_date', 'expires_at'],
            where: {
                user_id: userId,
                [Op.or]: [
                    { expires_at: null },
                    { expires_at: { [Op.gt]: new Date() } }
                ]
            },
            include: [
                {
                    model: ApplicationLicense,
                    as: 'application_license',
                    attributes: ['uuid', 'name', 'perpetual']
                }
            ]
        });

        const userWithOrgs = await User.findByPk(userId, {
            include: [{
                model: Organization,
                as: 'organizations',
                include: [{
                    model: OrganizationLicenseEntitlement,
                    as: 'application_license_entitlements',
                    attributes: ['id', 'original_purchase_date', 'expires_at'],
                    where: {
                        [Op.or]: [
                            { expires_at: null },
                            { expires_at: { [Op.gt]: new Date() } }
                        ]
                    },
                    include: [
                        {
                            model: ApplicationLicense,
                            as: 'application_license',
                            attributes: ['uuid', 'name', 'stripe_id', 'perpetual']
                        }
                    ]
                }]
            }]
        });

        const direct = userLicenses.map(ul => {
            const lic = ul.get({ plain: true });
            return {
                ...lic,
                granted_by: 'self'
            };
        });

        const orgEntitlements = ((userWithOrgs?.get({ plain: true })?.organizations as any[]) || [])
        .flatMap(org => org.application_license_entitlements as any[])
        .map(ent => ({
            ...ent,
            granted_by: 'org'
        }));

        const allLicenses = [...direct, ...orgEntitlements];

        return res.json({
        success: true,
        data: allLicenses
        });

    } catch (error) {
        console.error('Error fetching application licenses for the user:', error);
        return res.status(500).json({
        success: false,
        error: 'Failed to fetch user application licenses'
        });
    }
    }

  /**
   * Checks if the user is able to access the license
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async checkLicenseAccess(req: Request, res: Response): Promise<Response> {
    console.log("In checkLicenseAccess API");
    return res.send("Hi");
  }

  /**
   * Applies a valid access code to the corresponding license for a user
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async applyAccessCodeToLicense(req: Request, res: Response): Promise<Response> {
    console.log("In applyAccessCodeToLicense API");

    try {
        const { accessCode } = req.body;
        const results = await AccessCode.findOne({
            where: { code: accessCode },
        });

        if (!results) {
            return errors.notFound(res);
        }

        // const license = await ApplicationLicense.findOne({
        //     where: { uuid: results.application_license_id },
        // });
        
        // if (!license) {
        //     return errors.notFound(res);
        // }

        if (results.redeemed) {
            return res.status(409).json({
                success: false,
                error: 'This access code has already been redeemed',
            });
        }

        if (results.void) {
            return res.status(400).json({
                success: false,
                error: 'This access code is invalid',
            });
        }

        await results.update({
            redeemed: true
        });

    
        return res.json({
            message: 'Access code redeemed successfully'
        })
    } catch (error) {
        console.error('Error applying the access code:', error);
        return res.status(500).json({
            success: false,
            error: 'Invalid Access Code'
        });
    }
  }

  public async createTrial(req: Request, res: Response): Promise<Response> {
    console.log("In createTrial API");

    try {
        const { user_id, application_license_id } = req.body;

        const existingLicense = await UserLicense.findOne({
            where: {
                user_id: user_id,
                application_license_id: application_license_id
            }
        });

        if (existingLicense) {
            const now = new Date();
            
            if (existingLicense.expires_at && existingLicense.expires_at < now) {
                return res.status(400).json({
                    success: false,
                    error: 'Your license plan expired, please renew'
                });
            } else {
                return res.status(200).json({
                    success: true,
                    message: 'You already have this license'
                });
            }
        }


        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 14);

        const userLicense = await UserLicense.create({
            user_id: user_id,
            application_license_id: application_license_id,
            original_purchase_date: new Date(),
            last_renewed_at: new Date(),
            expires_at: expiresAt,
        });

        return res.json({
            message: 'Trial access granted successfully',
            data: {
                expiresAt: expiresAt
            }
        })
    } catch (error) {
        console.error('Error giving trial access:', error);
        return res.status(500).json({
            success: false,
            error: 'Error giving trial access'
        });
    }
  }

  public async renewLicense(req: Request, res: Response): Promise<Response> {
    console.log("In renewLicense API");
   
    try {
        const { user_id, org_id, application_license_id } = req.body;
        
        if (!application_license_id) {
            return res.status(400).json({
                success: false,
                error: 'application_license_id is required'
            });
        }

        if (!user_id && !org_id) {
            return res.status(400).json({
                success: false,
                error: 'Either user_id or org_id is required'
            });
        }

        if (user_id && org_id) {
            return res.status(400).json({
                success: false,
                error: 'Cannot renew license for both user and organization simultaneously'
            });
        }

        let license;
        let licenseType: 'user' | 'organization';

        if (user_id) {
            license = await UserLicense.findOne({
                where: {
                    user_id: user_id,
                    application_license_id: application_license_id
                },
                include: [
                    {
                        model: ApplicationLicense,
                        attributes: ['duration_days']
                    }
                ],
            });
            licenseType = 'user';
        } else {
            license = await OrganizationLicenseEntitlement.findOne({
                where: {
                    org_id: org_id,
                    application_license_id: application_license_id
                },
                include: [
                    {
                        model: ApplicationLicense,
                        attributes: ['duration_days']
                    }
                ]
            });
            licenseType = 'organization';
        }

        if (!license) {
            return res.status(404).json({
                success: false,
                error: `No existing license found for the given ${licenseType} and application`
            });
        }

        const existingLicense = license.get();

        if (!existingLicense.application_license) {
            return res.status(500).json({
                success: false,
                error: 'Application license data not found'
            });
        }

        const durationDays = existingLicense.application_license.duration_days;
        
        if (!existingLicense.expires_at && durationDays === 0) {
            return res.status(400).json({
                success: false,
                error: 'Perpetual licenses cannot be renewed'
            });
        }

        const currentDate = new Date();
        const currentExpiryDate = new Date(existingLicense.expires_at);
        
        let newExpiryDate: Date;

        if (currentExpiryDate > currentDate) {
            // License hasn't expired yet - extend from current expiry date
            newExpiryDate = new Date(currentExpiryDate);
            newExpiryDate.setDate(currentExpiryDate.getDate() + durationDays);
        } else {
            // License has already expired - extend from today
            newExpiryDate = new Date(currentDate);
            newExpiryDate.setDate(currentDate.getDate() + durationDays);
        }

        if (licenseType === 'user') {
            await UserLicense.update(
                {
                    last_renewed_at: currentDate,
                    expires_at: newExpiryDate
                },
                {
                    where: {
                        user_id: user_id,
                        application_license_id: application_license_id
                    }
                }
            );
        } else {
            await OrganizationLicenseEntitlement.update(
                {
                    last_renewed_at: currentDate,
                    expires_at: newExpiryDate
                },
                {
                    where: {
                        org_id: org_id,
                        application_license_id: application_license_id
                    }
                }
            );
        }

        return res.status(200).json({
            success: true,
            message: `${licenseType === 'user' ? 'User' : 'Organization'} license renewed successfully`,
            data: {
                ...(user_id && { user_id: existingLicense.user_id }),
                ...(org_id && { org_id: existingLicense.org_id }),
                application_license_id: existingLicense.application_license_id,
                last_renewed_at: currentDate,
                expires_at: newExpiryDate,
                license_type: licenseType
            }
        });

    } catch (error) {
        console.error('Error renewing user license:', error);
        return res.status(500).json({
            success: false,
            error: 'Error renewing user license'
        });
    }
  }

  public async manualGrantLicense(req: Request, res: Response): Promise<Response> {
    
    console.log("In manualGrantLicense API");
    try {
        const { application_license_id, user_id, org_id } = req.body;

        if (!application_license_id) {
            return res.status(400).json({
                success: false,
                error: 'application_license_id is required'
            });
        }

        if (!user_id && !org_id) {
            return res.status(400).json({
                success: false,
                error: 'Either user_id or org_id is required'
            });
        }

        if (user_id && org_id) {
            return res.status(400).json({
                success: false,
                error: 'Cannot grant license to both user and organization simultaneously'
            });
        }

        if (user_id) {
            const userExists = await User.findByPk(user_id);
            if (!userExists) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }
        }

        if (org_id) {
            const orgExists = await Organization.findByPk(org_id);
            if (!orgExists) {
                return res.status(404).json({
                    success: false,
                    error: 'Organization not found'
                });
            }
        }

        const applicationLicense = await ApplicationLicense.findByPk(application_license_id);
        
        if (!applicationLicense) {
            return res.status(404).json({
                success: false,
                error: 'Application license not found'
            });
        }

        const currentDate = new Date();
        let expiresAt: Date | null = null;

        if (applicationLicense.duration_days > 0) {
            expiresAt = new Date(currentDate);
            expiresAt.setDate(currentDate.getDate() + applicationLicense.duration_days);
        }

        let grantedLicense;

        if (user_id) {
            const existingUserLicense = await UserLicense.findOne({
                where: {
                    user_id: user_id,
                    application_license_id: application_license_id
                }
            });

            if (existingUserLicense) {
                return res.status(409).json({
                    success: false,
                    error: 'License already granted to this user'
                });
            }

            grantedLicense = await UserLicense.create({
                user_id: user_id,
                application_license_id: application_license_id,
                original_purchase_date: currentDate,
                last_renewed_at: currentDate,
                expires_at: expiresAt
            });

        } else if (org_id) {
            const existingOrgLicense = await OrganizationLicenseEntitlement.findOne({
                where: {
                    org_id: org_id,
                    application_license_id: application_license_id
                }
            });

            if (existingOrgLicense) {
                return res.status(409).json({
                    success: false,
                    error: 'License already granted to this organization'
                });
            }

            grantedLicense = await OrganizationLicenseEntitlement.create({
                org_id: org_id,
                application_license_id: application_license_id,
                original_purchase_date: currentDate,
                last_renewed_at: currentDate,
                expires_at: expiresAt
            });
        }

        return res.status(201).json({
            success: true,
            message: `License granted successfully to ${user_id ? 'user' : 'organization'}`,
            data: {
                license_id: grantedLicense.uuid,
                application_license_id: application_license_id,
                ...(user_id && { user_id }),
                ...(org_id && { org_id }),
                original_purchase_date: currentDate,
                last_renewed_at: currentDate,
                expires_at: expiresAt,
                is_perpetual: applicationLicense.perpetual
            }
        });
    } catch (error) {
        console.error('Error granting license access:', error);
        return res.status(500).json({
            success: false,
            error: 'Error granting license access'
        });
    }
  }

  public async revokeLicense(req: Request, res: Response): Promise<Response> {
    // app_license_id, user_id or org_id
    console.log("In revokeLicense API");
    try {



        return res.json({
            data: "hi"
        })
    } catch (error) {
        console.error('Error revoking license:', error);
        return res.status(500).json({
            success: false,
            error: 'Error revoking license'
        });
    }
  }

  public async getAllOrgLicenses(req: Request, res: Response): Promise<Response> {
    console.log("In getAllOrgLicenses API");
    try {
        const { orgId } = req.params;

        const organization = await Organization.findByPk(orgId, {
            include: [
                {
                    model: OrganizationLicenseEntitlement,
                    as: 'application_license_entitlements',
                    attributes: ['id', 'original_purchase_date', 'expires_at'],
                    where: {
                        [Op.or]: [
                            { expires_at: null },
                            { expires_at: { [Op.gt]: new Date() } }
                        ]
                    },
                    required: false,
                    include: [
                        {
                            model: ApplicationLicense,
                            as: 'application_license',
                            attributes: ['uuid', 'name', 'perpetual'] 
                        }
                    ]
                }
            ]
        });

        if (!organization) {
            return errors.notFound(res);
        }

        const orgResult = organization.get();

        return res.json({
            data: orgResult
        })
    } catch (error) {
        console.error('Error revoking license:', error);
        return res.status(500).json({
            success: false,
            error: 'Error revoking license'
        });
    }
  }

  public async LicenseExpiringCheck(req: Request, res: Response): Promise<Response> {
    console.log("In LicenseExpiringCheck API");
    
    try {
        const { application_license_id, user_id, org_id } = req.body;

        if (!application_license_id) {
            return res.status(400).json({
                success: false,
                error: 'application_license_id is required'
            });
        }

        if (!user_id && !org_id) {
            return res.status(400).json({
                success: false,
                error: 'Either user_id or org_id is required'
            });
        }

        if (user_id && org_id) {
            return res.status(400).json({
                success: false,
                error: 'Cannot check license for both user and organization simultaneously'
            });
        }

        let license;
        let licenseType: 'user' | 'organization';

        if (user_id) {
            license = await UserLicense.findOne({
                where: {
                    user_id: user_id,
                    application_license_id: application_license_id
                },
                include: [
                    {
                        model: ApplicationLicense,
                        as: 'application_license' 
                    }
                ]
            });
            licenseType = 'user';
        } else {
            license = await OrganizationLicenseEntitlement.findOne({
                where: {
                    org_id: org_id,
                    application_license_id: application_license_id
                },
                include: [
                    {
                        model: ApplicationLicense,
                        as: 'application_license' 
                    }
                ]
            });
            licenseType = 'organization';
        }

        if (!license) {
            return res.status(404).json({
                success: false,
                error: `No license found for the given ${licenseType} and application`
            });
        }

        const expiresAt = license.expires_at;

        // Check if it's a perpetual license
        if (!expiresAt && license.perpetual) {
            return res.status(200).json({
                success: true,
                data: {
                    license_type: licenseType,
                    is_perpetual: true,
                    message: 'This is a perpetual license that never expires'
                }
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                license_type: licenseType,
                is_perpetual: false,
                expiresAt: expiresAt
            }
        });

    } catch (error) {
        console.error('Error checking license expiry:', error);
        return res.status(500).json({
            success: false,
            error: 'Error checking license expiry'
        });
    }
  }

}
