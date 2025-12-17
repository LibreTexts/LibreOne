
export type APIResponseMeta = Partial<{
    offset: number;
    limit: number;
    total: number;
}>;

export type APIResponse<T> = {
    meta: APIResponseMeta;
    data: T;
};

/**
 * Utility type to convert all properties of a type T to arrays,
 * unless the property is already an array.
 */
export type Arrayify<T> = {
  [K in keyof T]: T[K] extends any[] ? T[K] : T[K][];
};