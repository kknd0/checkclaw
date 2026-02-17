import {
  getApiUrl,
  getAuthType,
  getSessionToken,
  getApiKey,
  saveSession,
} from './config.js';

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    query?: Record<string, string | number | undefined>;
  } = {}
): Promise<ApiResponse<T>> {
  const baseUrl = getApiUrl();
  const { method = 'GET', body, query } = options;

  let url = `${baseUrl}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const authType = getAuthType();
  if (authType === 'apikey') {
    const key = getApiKey();
    if (key) headers['Authorization'] = `Bearer ${key}`;
  } else if (authType === 'session') {
    const token = getSessionToken();
    if (token) headers['Cookie'] = token;
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    redirect: 'manual',
  };
  if (body) fetchOptions.body = JSON.stringify(body);

  const res = await fetch(url, fetchOptions);

  // Capture session cookies from Set-Cookie
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    // Extract all cookie key=value pairs
    const cookies = setCookie
      .split(/,(?=\s*\w+=)/)
      .map((c) => c.split(';')[0].trim())
      .join('; ');
    if (cookies) saveSession(cookies);
  }

  let data: T;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = (await res.json()) as T;
  } else {
    data = (await res.text()) as unknown as T;
  }

  return { ok: res.ok, status: res.status, data };
}

export function requireAuth(): void {
  const authType = getAuthType();
  if (!authType) {
    console.error(
      'Not authenticated. Run `checkclaw login` or `checkclaw login --key <api-key>` first.'
    );
    process.exit(1);
  }
}
