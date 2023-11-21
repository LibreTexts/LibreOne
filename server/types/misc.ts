
export type APIResponseMeta = Partial<{
    offset: number;
    limit: number;
    total: number;
}>;

export type APIResponse<T> = {
    meta: APIResponseMeta;
    data: T;
};