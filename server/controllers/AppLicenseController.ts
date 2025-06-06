import errors from '../errors';
import { User, ApplicationLicense, AccessCode, UserLicense, Organization, OrganizationLicenseEntitlement, sequelize } from '../models';
import { GetAllLicensesQuery, LicenseIDParams } from '@server/types/licenses';
import { Request, Response } from 'express';
import { Op } from 'sequelize';

type LicenseStatus = 'active' | 'expired' | 'revoked' | 'none';
type AccessCodeStatus = 'active' | 'redeemed' | 'expired' | 'cancelled' | 'none';
type LicenseType = 'user' | 'organization';

interface UserLicenseResult {
    userData: User | null;
    directLicenses: Array<UserLicense & { granted_by: 'self' }>;
    orgLicenses: Array<OrganizationLicenseEntitlement & { granted_by: 'org' }>;
}

export class AppLicenseController {
    private _evaluateLicenseStatus(license: UserLicense | OrganizationLicenseEntitlement, includeRevoked: boolean = true): LicenseStatus {
        const now = new Date();
        
        if (includeRevoked && license.revoked) return 'revoked';
        if (!license.expires_at) return 'active'; 
        if (license.expires_at && new Date(license.expires_at) < now) return 'expired';
        if (!license.expires_at || new Date(license.expires_at) > now) return 'active';
        return 'none';
    }

    private _calculateNewExpiryDate(currentExpiryDate: Date | null, duration_days: number): Date {
        const currentDate = new Date();
        
        if (!currentExpiryDate || currentExpiryDate < currentDate) {
            // If expired or no expiry, extend from today
            const newExpiryDate = new Date(currentDate);
            newExpiryDate.setDate(currentDate.getDate() + duration_days);
            return newExpiryDate;
        } else {
            // If not expired, extend from current expiry
            const newExpiryDate = new Date(currentExpiryDate);
            newExpiryDate.setDate(currentExpiryDate.getDate() + duration_days);
            return newExpiryDate;
        }
    }

    private async _getUserLicense(userId: string, applicationLicenseId?: string, plain: boolean = false): Promise<UserLicense | null> {
        const whereClause: any = { user_id: userId };
        if (applicationLicenseId) {
            whereClause.application_license_id = applicationLicenseId;
        }
    
        const license = await UserLicense.findOne({
            where: whereClause,
            include: [{
                model: ApplicationLicense,
                as: 'application_license',
                required: false
            }]
        });
    
        if (!license) {
            return null;
        }
    
        return plain ? license.get({ plain: true }) : license;
    }

    /**
     * Fetches a user’s licenses, with optional filters:
     *   - includeRevoked: if false (default), excludes revoked=true rows
     *   - onlyExpired: if true, includes only licenses with expires_at < NOW()
     *   - onlyActive:   if true, includes only licenses with expires_at >= NOW()
     * 
     * Note: onlyExpired and onlyActive should not both be true simultaneously.
     */
    private async _getAllUserLicenses(
        userId: string,
        applicationLicenseId?: string,
        options?: {
            includeRevoked?: boolean;  
            onlyExpired?: boolean;    
            onlyActive?: boolean;      
        }
    ): Promise<UserLicenseResult | null> {
        const includeRevoked = options?.includeRevoked ?? false;
        const onlyExpired = options?.onlyExpired ?? false;
        const onlyActive = options?.onlyActive ?? false;
    
        if (onlyExpired && onlyActive) {
            throw new Error('Cannot set both onlyExpired and onlyActive to true.');
        }
    
        // Build filters for UserLicense
        const licenseWhere: any = {};
        if (!includeRevoked) {
            licenseWhere.revoked = false;
        }
        if (onlyExpired) {
            licenseWhere.expires_at = { [Op.lt]: new Date() };
        } else if (onlyActive) {
            licenseWhere.expires_at = { [Op.gte]: new Date() };
        }
        if (applicationLicenseId) {
            licenseWhere.application_license_id = applicationLicenseId;
        }
    
        // Build filters for OrganizationLicenseEntitlement
        const orgEntitlementWhere: any = {};
        if (!includeRevoked) {
            orgEntitlementWhere.revoked = false;
        }
        if (onlyExpired) {
            orgEntitlementWhere.expires_at = { [Op.lt]: new Date() };
        } else if (onlyActive) {
            orgEntitlementWhere.expires_at = { [Op.gte]: new Date() };
        }
        if (applicationLicenseId) {
            orgEntitlementWhere.application_license_id = applicationLicenseId;
        }
    
        const user = await User.findByPk(userId, {
        include: [
            {
            model: UserLicense,
            as: 'application_licenses',
            where: Object.keys(licenseWhere).length ? licenseWhere : undefined,
            required: false,
            include: [
                {
                model: ApplicationLicense,
                as: 'application_license',
                },
            ],
            },
            {
            model: Organization,
            as: 'organizations',
            required: false,
            through: { attributes: [] },
            include: [
                {
                model: OrganizationLicenseEntitlement,
                as: 'application_license_entitlements',
                where: Object.keys(orgEntitlementWhere).length
                    ? orgEntitlementWhere
                    : undefined,
                required: false,
                include: [
                    {
                    model: ApplicationLicense,
                    as: 'application_license',
                    },
                ],
                },
            ],
            },
        ],
        });
    
        if (!user) {
        return null;
        }
        const userData = user.get({ plain: true });
    
        const directLicenses =
        userData.application_licenses?.map((license: any) => ({
            ...license,
            granted_by: 'self' as const,
        })) || [];
    
        const orgLicenses =
        userData.organizations?.flatMap((org: any) =>
            (org.application_license_entitlements || []).map((lic: any) => ({
            ...lic,
            granted_by: 'org' as const,
            }))
        ) || [];
    
        return { userData, directLicenses, orgLicenses };
    }

    public async getAllUserLicenses(req: Request, res: Response): Promise<Response> {
        
            try {
                const { uuid: user_id } = req.params;
                const result = await this._getAllUserLicenses(user_id, undefined, {
                    includeRevoked: false,
                    onlyActive: true
                });

                if (!result) {
                    return res.status(404).json({
                        success: false,
                        error: "User not found"
                    });
                }

                const { directLicenses, orgLicenses } = result;

                const activeLicenses = [...directLicenses, ...orgLicenses];
                
                return res.status(200).json({
                    success: true,
                    message: "User licenses fetched successfully",
                    data: activeLicenses
                });

            } catch (error) {
                console.error("Error getting all user licenses:", error);
                return res.status(500).json({
                    error: "Error getting all user licenses"
                });
            }
    }
    
    public async checkLicenseAccess(req: Request, res: Response): Promise<Response> {

        try {
            const { uuid: user_id, application_license_id } = req.params;
            let user = await this._getAllUserLicenses(user_id, application_license_id, {
                includeRevoked: true 
            });

            if (!user) {
                return res.status(404).send({
                  meta: {
                    hasAccess: false,
                    status: 'none',
                  },
                  error: 'User not found'
                });
            }

            const { directLicenses, orgLicenses } = user;

            const directStatus = directLicenses.length > 0 
                ? this._evaluateLicenseStatus(directLicenses[0])
                : 'none';
            
            const orgStatus = orgLicenses.length > 0
                ? this._evaluateLicenseStatus(orgLicenses[0])
                : 'none';

            // Priority order: active > expired > revoked > none
            let responseData;

            // Case 1: Both are active - return org data
            if (directStatus === 'active' && orgStatus === 'active') {
                responseData = {
                    meta: {
                        hasAccess: true,
                        status: 'active',
                        granted_by: 'org'
                    },
                    data: {
                        license: orgLicenses[0]
                    },
                    message: 'User has active organization license'
                };
            }
            // Case 2: One is active - return the active one
            else if (directStatus === 'active' || orgStatus === 'active') {
                const activeLicense = directStatus === 'active' ? directLicenses[0] : orgLicenses[0];
                const grantedBy = directStatus === 'active' ? 'self' : 'org';
                responseData = {
                    meta: {
                        hasAccess: true,
                        status: 'active',
                        granted_by: grantedBy
                    },
                    data: {
                        license: activeLicense
                    },
                    message: `User has active ${grantedBy === 'self' ? 'direct' : 'organization'} license`
                };
            }
            // Case 3: Both are expired - return org expiry info
            else if (directStatus === 'expired' && orgStatus === 'expired') {
                responseData = {
                    meta: {
                        hasAccess: false,
                        status: 'expired',
                        granted_by: 'org'
                    },
                    data: {
                        license: orgLicenses[0]
                    },
                    message: 'Organization license has expired'
                };
            }
            // Case 4: One is expired, other is revoked/none
            else if (directStatus === 'expired' || orgStatus === 'expired') {
                const expiredLicense = directStatus === 'expired' ? directLicenses[0] : orgLicenses[0];
                const grantedBy = directStatus === 'expired' ? 'self' : 'org';
                responseData = {
                    meta: {
                        hasAccess: false,
                        status: 'expired',
                        granted_by: grantedBy
                    },
                    data: {
                        license: expiredLicense
                    },
                    message: `${grantedBy === 'self' ? 'Direct' : 'Organization'} license has expired`
                };
            }
            // Case 5: Both are revoked - return org revoked info
            else if (directStatus === 'revoked' && orgStatus === 'revoked') {
                responseData = {
                    meta: {
                        hasAccess: false,
                        status: 'revoked',
                        granted_by: 'org'
                    },
                    data: {
                        license: orgLicenses[0]
                    },
                    message: 'Organization license has been revoked'
                };
            }
            // Case 6: One is revoked, other is none
            else if (directStatus === 'revoked' || orgStatus === 'revoked') {
                const revokedLicense = directStatus === 'revoked' ? directLicenses[0] : orgLicenses[0];
                const grantedBy = directStatus === 'revoked' ? 'self' : 'org';
                responseData = {
                    meta: {
                        hasAccess: false,
                        status: 'revoked',
                        granted_by: grantedBy
                    },
                    data: {
                        license: revokedLicense
                    },
                    message: `${grantedBy === 'self' ? 'Direct' : 'Organization'} license has been revoked`
                };
            }
            // Case 7: No valid licenses found (both none)
            else {
                responseData = {
                    meta: {
                        hasAccess: false,
                        status: 'none',
                    },
                    message: 'No valid licenses found'
                };
            }

            return res.status(200).json(responseData);

        } catch (error) {
            console.error("Error checking license access:", error);
            return res.status(500).json({
                meta: {
                    hasAccess: false,
                    status: 'none',
                },
                error: 'Internal server error'
            });
        }
    }

    public async applyAccessCodeToLicense(req: Request, res: Response): Promise<Response> {
        try {
            const { accessCode, uuid: user_id } = req.body;
            const accessCodeRecord = await AccessCode.findOne({
                where: { code: accessCode },
                include: [{
                    model: ApplicationLicense,
                    as: 'application_license'
                }]
            });
    
            if (!accessCodeRecord) {
                return errors.notFound(res);
            }
    
            if (accessCodeRecord.redeemed) {
                return res.status(409).json({
                    success: false,
                    error: 'This access code has already been redeemed',
                    meta: {
                        status: 'redeemed' as AccessCodeStatus
                    }
                });
            }
    
            if (accessCodeRecord.void) {
                return res.status(400).json({
                    success: false,
                    error: 'This access code is invalid',
                    meta: {
                        status: 'cancelled' as AccessCodeStatus
                    }
                });
            }
    
            const transaction = await sequelize.transaction();
    
            try {
                const currentDate = new Date();
                const existingLicense = await UserLicense.findOne({
                    where: { 
                        user_id,
                        application_license_id: accessCodeRecord.application_license_id 
                    },
                    transaction
                });

                if (existingLicense && !existingLicense.expires_at) {
                    await transaction.rollback();
                    return res.status(400).json({
                        success: false,
                        error: 'Cannot apply access code to a perpetual license',
                    });
                }
    
                let userLicense;
                if (existingLicense && accessCodeRecord.application_license.duration_days) {
                    const newExpiryDate = this._calculateNewExpiryDate(
                        existingLicense.expires_at, 
                        accessCodeRecord.application_license.duration_days
                    );
                    
                    await existingLicense.update({
                        revoked: false,
                        revoked_at: null,
                        last_renewed_at: currentDate,
                        expires_at: newExpiryDate
                    }, { transaction });
                    userLicense = existingLicense;
                } else if (!existingLicense) {
                    userLicense = await UserLicense.create({
                        user_id: user_id,
                        application_license_id: accessCodeRecord.application_license_id,
                        original_purchase_date: currentDate,
                        last_renewed_at: currentDate,
                        expires_at: accessCodeRecord.application_license.duration_days 
                            ? new Date(Date.now() + accessCodeRecord.application_license.duration_days * 24 * 60 * 60 * 1000)
                            : null,
                    }, { transaction });
                }
    
                await accessCodeRecord.update({
                    redeemed: true,
                    redeemed_at: currentDate
                }, { transaction });
    
                await transaction.commit();
    
                return res.status(200).json({
                    success: true,
                    message: existingLicense ? 'License renewed successfully' : 'New license created successfully',
                    meta: {
                        access_code: {
                            code: accessCodeRecord.code,
                            redeemed_at: currentDate
                        },
                    },
                    data: {
                        license: userLicense,
                    }
                });
    
            } catch (transactionError) {
                await transaction.rollback();
                throw transactionError;
            }
        } catch (error) {
            console.error('Error applying the access code:', error);
            return res.status(500).json({
                success: false,
                error: 'Invalid Access Code'
            });
        }
    }

    public async createTrial(req: Request, res: Response): Promise<Response> {

        try {
            const { uuid: user_id, application_license_id } = req.body;
    
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
                        error: 'Your license plan expired, please renew',
                        meta: {
                            status: 'expired' as LicenseStatus
                        }
                    });
                } 
                else if (existingLicense.revoked) {
                    return res.status(400).json({
                        success: false,
                        error: 'Your license has been revoked, please contact support',
                        meta: {
                            status: 'revoked' as LicenseStatus
                        }
                    });
                }
                else {
                    return res.status(200).json({
                        success: true,
                        message: 'You already have this license',
                        meta: {
                            status: 'active' as LicenseStatus
                        }
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
                    expiresAt: expiresAt,
                    license: userLicense,
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

        try {
            const { uuid: user_id } = req.params;
            const { application_license_id } = req.body;

            const userLicense = await this._getUserLicense(user_id, application_license_id, false);
    
            if (!userLicense) {
                return res.status(404).json({
                    success: false,
                    error: 'License not found'
                });
            }
    
            if (userLicense.revoked) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot renew a revoked license'
                });
            }
    
            if (!userLicense.expires_at && !userLicense.application_license?.duration_days) {
                return res.status(400).json({
                    success: false,
                    error: 'Perpetual licenses cannot be renewed'
                });
            }
    
            const currentDate = new Date();
            const plainLookup = userLicense.toJSON();
            const durationDays = plainLookup.application_license.duration_days;
    
            let newExpiryDate = this._calculateNewExpiryDate(
                userLicense.expires_at,
                durationDays
            );
    
            await userLicense.update({
                last_renewed_at: currentDate,
                expires_at: newExpiryDate
            });
    
            return res.status(200).json({
                success: true,
                message: 'License renewed successfully',
                data: {
                    user_id: user_id,
                    application_license_id: application_license_id,
                    last_renewed_at: currentDate,
                    expires_at: newExpiryDate
                }
            });
    
        } catch (error) {
            console.error('Error renewing license:', error);
            return res.status(500).json({
                success: false,
                error: 'Error renewing license'
            });
        }
    }

    public async manualGrantLicense(req: Request, res: Response): Promise<Response> {

        try {
            const { uuid: user_id, org_id, application_license_id } = req.body;
    
            if (user_id) {
                const user = await User.findByPk(user_id);
                if (!user) {
                    return res.status(404).json({
                        success: false,
                        error: 'User not found'
                    });
                }
            }
    
            if (org_id) {
                const org = await Organization.findByPk(org_id);
                if (!org) {
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
    
            const transaction = await sequelize.transaction();
    
            try {
                const currentDate = new Date();
                const expiresAt = applicationLicense.duration_days 
                    ? new Date(currentDate.getTime() + applicationLicense.duration_days * 24 * 60 * 60 * 1000)
                    : null;
    
                let license;
                if (user_id) {
                    const userLicense = await this._getUserLicense(user_id, application_license_id, false);
    
                    if (userLicense) {
                        await userLicense.update({
                            revoked: false,
                            revoked_at: null,
                            last_renewed_at: currentDate,
                            expires_at: expiresAt
                        }, { transaction });
                        license = userLicense;
                    } else {
                        license = await UserLicense.create({
                            user_id,
                            application_license_id,
                            original_purchase_date: currentDate,
                            last_renewed_at: currentDate,
                            expires_at: expiresAt,
                            revoked: false
                        }, { transaction });
                    }
                } else {
                    let orgLicense = await OrganizationLicenseEntitlement.findOne({
                        where: { org_id, application_license_id }
                    });
    
                    if (orgLicense) {
                        await orgLicense.update({
                            revoked: false,
                            revoked_at: null,
                            last_renewed_at: currentDate,
                            expires_at: expiresAt
                        }, { transaction });
                        license = orgLicense;
                    } else {
                        license = await OrganizationLicenseEntitlement.create({
                            org_id,
                            application_license_id,
                            original_purchase_date: currentDate,
                            last_renewed_at: currentDate,
                            expires_at: expiresAt,
                        }, { transaction });
                    }
                }
    
                await transaction.commit();
    
                return res.status(200).json({
                    success: true,
                    message: 'License granted successfully',
                    data: {
                        license,
                        type: user_id ? 'user' : 'organization',
                        status: 'active' as LicenseStatus,
                        expires_at: expiresAt,
                        is_perpetual: !applicationLicense.duration_days
                    }
                });
    
            } catch (transactionError) {
                await transaction.rollback();
                throw transactionError;
            }
    
        } catch (error) {
            console.error('Error in manual license grant:', error);
            return res.status(500).json({
                success: false,
                error: 'Error granting license'
            });
        }
    }

    public async revokeLicense(req: Request, res: Response): Promise<Response> {

        try {
            const { uuid: user_id, org_id, application_license_id } = req.body;
            const currentDate = new Date();
            
            let license;
            let licenseType: LicenseType;
            
            if (user_id) {
                license = await this._getUserLicense(user_id, application_license_id, false);
                licenseType = 'user';
            } else {
                license = await OrganizationLicenseEntitlement.findOne({
                    where: { 
                        org_id, 
                        application_license_id
                    }
                });
                licenseType = 'organization';
            }
    
            if (!license) {
                return res.status(404).json({
                    success: false,
                    error: `No license found for this ${licenseType}`
                });
            }
    
            if (license.revoked) {
                return res.status(400).json({
                    success: false,
                    error: `This ${licenseType} license was already revoked on ${license.revoked_at?.toDateString()}`,
                    details: {
                        revoked_at: license.revoked_at
                    }
                });
            }
    
            if (user_id) {
                await UserLicense.update(
                    {
                        revoked: true,
                        revoked_at: currentDate
                    },
                    {
                        where: { 
                            user_id, 
                            application_license_id 
                        }
                    }
                );
            } else {
                await OrganizationLicenseEntitlement.update(
                    {
                        revoked: true,
                        revoked_at: currentDate
                    },
                    {
                        where: { 
                            org_id, 
                            application_license_id 
                        }
                    }
                );
            }
    
            return res.status(200).json({
                success: true,
                message: `${licenseType} license revoked successfully`,
                data: {
                    id: user_id || org_id,
                    type: licenseType,
                    application_license_id,
                    revoked_at: currentDate
                }
            });
        } catch (error) {
            console.error('Error revoking license:', error);
            return res.status(500).json({
                success: false,
                error: 'Error revoking license'
            });
        }
    }

    public async LicenseExpiringCheck(req: Request, res: Response): Promise<Response> {
        
        try {
            const { application_license_id, uuid: user_id, org_id } = req.body;
    
            let license;
            let licenseType: LicenseType;
    
            if (user_id) {
                license = await this._getUserLicense(user_id, application_license_id, true);
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
            const status = this._evaluateLicenseStatus(license, false);
    
            if (!expiresAt) {
                return res.status(200).json({
                    success: true,
                    meta: {
                        license_type: licenseType,
                        is_perpetual: true,
                        status: status,
                        message: 'This is a perpetual license that never expires'
                    }
                });
            }
    
            return res.status(200).json({
                success: true,
                meta: {
                    license_type: licenseType,
                    is_perpetual: false,
                    expiresAt: expiresAt,
                    status: status
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

    public async getUserExpiredLicenses(req: Request, res: Response): Promise<Response> {

        try {
            const { uuid: user_id } = req.params;
            const result = await this._getAllUserLicenses(user_id, undefined, {
                includeRevoked: false,
                onlyExpired: true
            });
    
            if (!result) {
                return res.status(404).json({
                    success: false,
                    error: "User not found"
                });
            }
    
            const { directLicenses, orgLicenses } = result;
            
            const expiredLicenses = [...directLicenses, ...orgLicenses]
    
            return res.status(200).json({
                success: true,
                message: "Expired licenses fetched successfully",
                meta: {
                    total_expired: expiredLicenses.length,
                },
                data: expiredLicenses
            });
    
        } catch (error) {
            console.error('Error getting expired licenses:', error);
            return res.status(500).json({
                success: false,
                error: 'Error getting expired licenses'
            });
        }
    }

    public async getAllOrgLicenses(req: Request, res: Response): Promise<Response> {

        try {
            const { org_id } = req.params;
    
            const organization = await Organization.findByPk(org_id, {
                include: [
                    {
                        model: OrganizationLicenseEntitlement,
                        as: 'application_license_entitlements',
                        attributes: ['id', 'original_purchase_date', 'expires_at'],
                        where: {
                            revoked: false,
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
            const licenseEntitlements = orgResult.application_license_entitlements || [];
    
            return res.json({
                success: true,
                message: "Organization licenses fetched successfully",
                meta: {
                    total_licenses: licenseEntitlements.length
                },
                data: licenseEntitlements
            });
        } catch (error) {
            console.error('Error getting organization licenses:', error);
            return res.status(500).json({
                success: false,
                error: 'Error getting organization licenses'
            });
        }
    }

}