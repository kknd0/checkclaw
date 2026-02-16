import Conf from 'conf';
import { error } from '../utils/format.js';

const config = new Conf({
  projectName: 'checkclaw',
});

const API_KEY_PREFIX = 'ck_live_';
const DEFAULT_BASE_URL = 'https://api.checkclaw.com';

export function getApiKey(): string | undefined {
  return config.get('apiKey') as string | undefined;
}

export function setApiKey(key: string): void {
  if (!key.startsWith(API_KEY_PREFIX)) {
    throw new Error(`Invalid API key: must start with "${API_KEY_PREFIX}"`);
  }
  config.set('apiKey', key);
}

export function clearApiKey(): void {
  config.delete('apiKey');
}

export function getApiBaseUrl(): string {
  return (config.get('apiBaseUrl') as string) || DEFAULT_BASE_URL;
}

export function isLoggedIn(): boolean {
  return !!getApiKey();
}

export function requireAuth(): string {
  const key = getApiKey();
  if (!key) {
    error('Not logged in. Run "checkclaw login" first.');
    process.exit(1);
  }
  return key;
}
