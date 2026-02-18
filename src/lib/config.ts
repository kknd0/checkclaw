import Conf from 'conf';
import { createHash } from 'crypto';
import { hostname, userInfo } from 'os';

export interface CheckclawConfig {
  apiUrl: string;
  authType: 'session' | 'apikey' | null;
  sessionToken: string | null;
  apiKey: string | null;
}

/**
 * Derive a machine-specific encryption key so credentials are not
 * stored in plain-text JSON.  The key is deterministic per user+host
 * so the config file stays portable across sessions on the same machine.
 */
function deriveEncryptionKey(): string {
  const material = `checkclaw:${userInfo().username}@${hostname()}`;
  return createHash('sha256').update(material).digest('hex');
}

const config = new Conf<CheckclawConfig>({
  projectName: 'checkclaw',
  encryptionKey: deriveEncryptionKey(),
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
