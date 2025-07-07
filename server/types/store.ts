
export type GenerateAccessCodeRequestBody = {
    application_license_id: string;
    email: string;
} | {
    stripe_price_id: string;
    email: string;
};

export type BulkGenerateAccessCodesRequestBody = {
    application_license_id: string;
    quantity: number;
};