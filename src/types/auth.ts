export interface UserProfile {
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
}

export interface DeviceCodeResponse {
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}

export type AuthStep = "idle" | "checking" | "polling" | "authenticated";

export type AuthProgressEvent =
  | {
      type: "polling";
      attempt: number;
      intervalSeconds: number;
      message: string;
    }
  | {
      type: "slowDown";
      intervalSeconds: number;
      message: string;
    }
  | {
      type: "success";
      login: string;
      message: string;
    };

export interface AuthStoreState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasResolvedAuth: boolean;
  authStep: AuthStep;
  deviceCode: DeviceCodeResponse | null;
  progressMessage: string | null;
  errorMessage: string | null;
}

export interface AuthStoreActions {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export type AuthStore = AuthStoreState & AuthStoreActions;
