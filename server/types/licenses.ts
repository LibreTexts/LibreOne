export type LicenseIDParams = {
    licenseID: number;
}

export type GetAllLicensesQuery = {
    offset: number;
    limit: number;
    query?: string;
}
