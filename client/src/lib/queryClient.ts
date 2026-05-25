import { QueryClient, QueryFunction } from "@tanstack/react-query";

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

const TOKEN_KEY = "__authToken__";
let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null) {
  inMemoryToken = token;
  // 새로고침 후에도 유지하기 위해 sessionStorage 시도 — 실패하면 메모리만 사용
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch (_) {
    // sandbox에서 storage 차단된 경우 메모리만 사용
  }
}

export function getAuthToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  try {
    const t = sessionStorage.getItem(TOKEN_KEY);
    if (t) inMemoryToken = t;
    return t;
  } catch (_) {
    return null;
  }
}

function authHeaders(includeContentType: boolean): Record<string, string> {
  const headers: Record<string, string> = {};
  if (includeContentType) headers["Content-Type"] = "application/json";
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers: authHeaders(Boolean(data)),
    body: data ? JSON.stringify(data) : undefined,
  });

  if (res.status === 401) {
    // 토큰 만료/무효 시 토큰 제거 후 로그인 화면으로 유도
    setAuthToken(null);
    window.dispatchEvent(new CustomEvent("auth:logout"));
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(`${API_BASE}${queryKey.join("/")}`, {
      headers: authHeaders(false),
    });

    if (res.status === 401) {
      setAuthToken(null);
      window.dispatchEvent(new CustomEvent("auth:logout"));
      if (unauthorizedBehavior === "returnNull") return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
