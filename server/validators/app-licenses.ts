import joi from 'joi';

const uuidValidator = joi.string().uuid({ version: "uuidv4" });
const applicationLicenseIdValidator = joi.string().required();
export const orgIDValidator = joi.number().integer();

export const userIdParamSchema = joi.object({
    user_id: uuidValidator.required(),
});

export const orgIdParamSchema = joi.object({
    org_id: orgIDValidator.required(),
});

export const applicationLicenseIdSchema = joi.object({
    application_license_id: applicationLicenseIdValidator
});

export const licenseOperationSchema = joi.object({
    user_id: uuidValidator,
    org_id: orgIDValidator,
    application_license_id: applicationLicenseIdValidator
}).xor('user_id', 'org_id');

export const redeemAccessCodeSchema = joi.object({
    access_code: uuidValidator.required(),
    user_id: uuidValidator.required(),
});

export const checkAccessSchema = joi.object({
    user_id: uuidValidator.required(),
    app_id: joi.number().integer().required(),
})

export const directLicenseOperationSchema = joi.object({
    user_id: uuidValidator.required(),
    application_license_id: applicationLicenseIdValidator
});
