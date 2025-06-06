import joi from 'joi';

const uuidValidator = joi.string().uuid({ version: "uuidv4" });
const applicationLicenseIdValidator = joi.string().required();

export const directLicenseOperationSchema = joi.object({
    uuid: uuidValidator.required(),
    application_license_id: applicationLicenseIdValidator
});

export const userIdParamSchema = joi.object({
    uuid: uuidValidator.required(),
});

export const applicationLicenseIdSchema = joi.object({
    application_license_id: applicationLicenseIdValidator
});

export const bulkGenerateAccessCodesSchema = joi.object({
    application_license_id: applicationLicenseIdValidator,
    noAccessCodes: joi.number().min(1).max(1000).required()
});

export const getAllAppLicensesSchema = joi.object({
    query: joi.string().optional()
});