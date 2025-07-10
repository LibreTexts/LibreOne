import { ApplicationLicense, ApplicationLicenseEntitlement, OrganizationLicenseEntitlement, UserLicense } from "@server/models";
import { User } from "./users";

export type AppLicenseStatus = 'active' | 'expired' | 'revoked' | 'none' | 'error';
export type AppLicenseGrantedBy = 'self' | 'org';
export type AppLicenseType = 'user' | 'organization';

export type AccessCodeStatus = 'active' | 'redeemed' | 'expired' | 'cancelled' | 'none';

export type UserIDAndAppID = {
    user_id: string;
    app_id: number;
};

export type CheckLicenseAccessResponse = ({
    meta: {
        has_access: false;
        status: 'none'
    };
    message: string;
} | {
    meta: {
        has_access: false
        status: 'revoked'
        granted_by: AppLicenseGrantedBy;
    },
    data: {
        license: (UserLicense & { granted_by: 'self' }) | (OrganizationLicenseEntitlement & { granted_by: 'org' });
    },
    message: string;
} | {
    meta: {
        has_access: false;
        status: 'expired';
        granted_by: AppLicenseGrantedBy;
        was_trial?: boolean;
    },
    data: {
        license: (UserLicense & { granted_by: 'self' }) | (OrganizationLicenseEntitlement & { granted_by: 'org' });
    },
    message: string;
} | {
    meta: {
        has_access: true;
        status: 'active';
        granted_by: AppLicenseGrantedBy;
    },
    data: {
        license: (UserLicense & { granted_by: 'self' }) | (OrganizationLicenseEntitlement & { granted_by: 'org' });
    },
    message: string;
} | {
    meta: {
        has_access: false;
        status: 'error';
    },
    error: string;
})


export type ApplicationLicenseWithEntitlements = ApplicationLicense & {
    entitlements: Array<ApplicationLicenseEntitlement>;
}

export type LicenseOperationRequestBody = {
    user_id: string;
    application_license_id: string;
} | {
    org_id: number;
    application_license_id: string;
}


export type UserLicenseResult = {
    userData: User | null;
    directLicenses: Array<UserLicense & { granted_by: 'self'; application_license: ApplicationLicenseWithEntitlements }>;
    orgLicenses: Array<OrganizationLicenseEntitlement & { granted_by: 'org'; application_license: ApplicationLicenseWithEntitlements }>;
}

export type RedeemAccessCodeRequestBody = {
    access_code: string;
}
export type RedeemAccessCodeRequestParams = {
    user_id: string;
}