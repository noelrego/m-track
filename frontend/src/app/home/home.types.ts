export interface SessionResponse {
  user?: {
    username?: string;
    emailId?: string;
    role?: string;
    isRootAdmin?: boolean;
  };
}
