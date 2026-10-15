import {afterEach, describe, expect, it, vi} from 'vitest';

vi.mock('../../database/prisma.js', () => ({prisma: {}}));
vi.mock('../../database/redis.js', () => ({wrapRedis: vi.fn()}));

// constants.ts reads API_URI at import time, so each case imports a fresh copy.
async function cookieDomainFor(apiUri: string) {
  vi.resetModules();
  vi.stubEnv('API_URI', apiUri);

  const {UserService} = await import('../UserService.js');
  return UserService.cookieOptions().domain;
}

describe('UserService.cookieOptions domain', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ['https://api.example.com', '.example.com'],
    ['https://api.example.com.br', '.example.com.br'],
    ['https://api.plunk.example.com.br', '.example.com.br'],
    ['https://api.example.co.uk', '.example.co.uk'],
    ['https://api.example.com.au', '.example.com.au'],
    ['https://plunk-api.up.railway.app', '.plunk-api.up.railway.app'],
    ['http://app.plunk.local', '.plunk.local'],
    ['http://api.localhost', '.localhost'],
  ])('scopes the cookie for %s to %s', async (apiUri, expected) => {
    expect(await cookieDomainFor(apiUri)).toBe(expected);
  });

  it('scopes temporary-host sessions to the configured instance domain', async () => {
    vi.stubEnv('COOKIE_DOMAIN', 'mail-2-31-24-4.sslip.io');
    expect(await cookieDomainFor('https://api.mail-2-31-24-4.sslip.io')).toBe('.mail-2-31-24-4.sslip.io');
  });

  it('ignores a cookie domain that does not contain the API hostname', async () => {
    vi.stubEnv('COOKIE_DOMAIN', 'another.example.com');
    expect(await cookieDomainFor('https://api.example.com')).toBe('.example.com');
  });

  it.each(['http://localhost:8080', 'http://127.0.0.1:8080'])('sets no domain for %s', async apiUri => {
    expect(await cookieDomainFor(apiUri)).toBeUndefined();
  });
});
