declare namespace Express {
  export interface Request {
    isAPIUser?: boolean;
    isAuthenticated?: boolean;
    userUUID?: string;
  }
}