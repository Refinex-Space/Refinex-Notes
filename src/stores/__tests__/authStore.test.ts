import { beforeEach, describe, expect, it, vi } from "vitest";

import { authService } from "../../services/authService";
import type {
  AuthProgressEvent,
  DeviceCodeResponse,
  UserProfile,
} from "../../types/auth";
import { resetAuthStore, useAuthStore } from "../authStore";

vi.mock("../../services/authService", () => ({
  authService: {
    isNativeAvailable: vi.fn(() => true),
    checkStatus: vi.fn(),
    startLogin: vi.fn(),
    pollForLogin: vi.fn(),
    logout: vi.fn(),
    openVerificationUri: vi.fn(),
  },
}));

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

async function flushAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("authStore", () => {
  const user: UserProfile = {
    login: "refinex",
    name: "Refinex",
    avatar_url: "https://avatars.githubusercontent.com/u/1?v=4",
    email: "team@refinex.dev",
  };
  const deviceCode: DeviceCodeResponse = {
    userCode: "ABCD-EFGH",
    verificationUri: "https://github.com/login/device",
    expiresIn: 900,
    interval: 5,
  };

  beforeEach(() => {
    resetAuthStore();
    vi.clearAllMocks();
  });

  it("restores an authenticated session during startup check", async () => {
    vi.mocked(authService.checkStatus).mockResolvedValue(user);

    await useAuthStore.getState().checkAuth();

    expect(useAuthStore.getState().user).toEqual(user);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().authStep).toBe("authenticated");
    expect(useAuthStore.getState().hasResolvedAuth).toBe(true);
  });

  it("starts device flow, keeps the code visible, and authenticates after polling", async () => {
    const progressEvents: AuthProgressEvent[] = [];
    const deferred = createDeferred<UserProfile>();

    vi.mocked(authService.startLogin).mockResolvedValue(deviceCode);
    vi.mocked(authService.pollForLogin).mockImplementation(async (_interval, handler) => {
      handler?.({
        type: "polling",
        attempt: 1,
        intervalSeconds: 5,
        message: "等待浏览器授权...",
      });
      return deferred.promise;
    });

    await useAuthStore.getState().login();

    expect(useAuthStore.getState().deviceCode).toEqual(deviceCode);
    expect(useAuthStore.getState().authStep).toBe("polling");
    expect(useAuthStore.getState().progressMessage).toBe("等待浏览器授权...");

    deferred.resolve(user);
    await deferred.promise;
    await flushAsyncWork();

    expect(useAuthStore.getState().user).toEqual(user);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().deviceCode).toBeNull();
    expect(useAuthStore.getState().authStep).toBe("authenticated");

    expect(progressEvents).toEqual([]);
  });

  it("clears the session on logout", async () => {
    useAuthStore.setState({
      user,
      isAuthenticated: true,
      isLoading: false,
      hasResolvedAuth: true,
      authStep: "authenticated",
      deviceCode: null,
      progressMessage: null,
      errorMessage: null,
    });
    vi.mocked(authService.logout).mockResolvedValue(undefined);

    await useAuthStore.getState().logout();

    expect(vi.mocked(authService.logout)).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().authStep).toBe("idle");
  });
});
