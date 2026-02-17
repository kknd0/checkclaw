import Conf from 'conf';

export interface CheckclawConfig {
  apiUrl: string;
  authType: 'session' | 'apikey' | null;
  sessionToken: string | null;
  apiKey: string | null;
}

const config = new Conf<CheckclawConfig>({
  projectName: 'checkclaw',
  defaults: {
    apiUrl: 'https://api.checkclaw.com',
    authType: null,
    sessionToken: null,
    apiKey: null,
  },
});

export function getApiUrl(): string {
  return config.get('apiUrl');
}

export function setApiUrl(url: string): void {
  config.set('apiUrl', url);
}

export function getAuthType(): string | null {
  return config.get('authType');
}

export function getSessionToken(): string | null {
  return config.get('sessionToken');
}

export function getApiKey(): string | null {
  return config.get('apiKey');
}

export function saveSession(token: string): void {
  config.set('authType', 'session');
  config.set('sessionToken', token);
  config.set('apiKey', null);
}

export function saveApiKey(key: string): void {
  config.set('authType', 'apikey');
  config.set('apiKey', key);
  config.set('sessionToken', null);
}

export function clearAuth(): void {
  config.set('authType', null);
  config.set('sessionToken', null);
  config.set('apiKey', null);
}

export function isAuthenticated(): boolean {
  const authType = config.get('authType');
  if (authType === 'session') return !!config.get('sessionToken');
  if (authType === 'apikey') return !!config.get('apiKey');
  return false;
}

export { config };
