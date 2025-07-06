import joi from 'joi';

const uuidValidator = joi.string().uuid({ version: "uuidv4" });

export const directLicenseOperationSchema = joi.object({
    uuid: uuidValidator.required(),
    application_license_id: uuidValidator.required()
});

export const applicationLicenseIdSchema = joi.object({
    application_license_id: uuidValidator.required()
});

export const generateAccessCodeSchema = joi.object({
    stripe_product_id: joi.string().optional().not().empty(),
    application_license_id: uuidValidator.optional(),
    email: joi.string().email().required(),
}).xor('stripe_product_id', 'application_license_id');

export const bulkGenerateAccessCodesSchema = joi.object({
    application_license_id: uuidValidator.required(),
    quantity: joi.number().min(1).max(1000).required()
});

export const getAllAppLicensesSchema = joi.object({
    query: joi.string().optional()
});