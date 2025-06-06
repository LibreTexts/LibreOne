import joi from 'joi';

const uuidValidator = joi.string().uuid({ version: "uuidv4" });
const applicationLicenseIdValidator = joi.string().required();
export const orgIDValidator = joi.number().integer();

export const userIdParamSchema = joi.object({
    uuid: uuidValidator.required(),
});

export const orgIdParamSchema = joi.object({
    org_id: orgIDValidator.required(),
});

export const applicationLicenseIdSchema = joi.object({
    application_license_id: applicationLicenseIdValidator
});

export const licenseOperationSchema = joi.object({
    uuid: uuidValidator,
    org_id: orgIDValidator,
    application_license_id: applicationLicenseIdValidator
}).xor('uuid', 'org_id');

export const accessCodeSchema = joi.object({
    accessCode: uuidValidator.required(),
    uuid: uuidValidator.required(),
});

export const directLicenseOperationSchema = joi.object({
    uuid: uuidValidator.required(),
    application_license_id: applicationLicenseIdValidator
});

