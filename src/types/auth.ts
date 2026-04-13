export interface UserProfile {
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
}

export interface AuthStoreState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthStoreActions {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export type AuthStore = AuthStoreState & AuthStoreActions;
