import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

export type AccessConfig = {
  FIRSTREP_ACCESS_TEAM_DOMAIN?: string;
  FIRSTREP_ACCESS_AUD?: string;
  FIRSTREP_OWNER_EMAIL?: string;
};
export type User = { userId: string; email: string };
const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export function configured(env: AccessConfig): boolean {
  return !!(env.FIRSTREP_ACCESS_AUD?.trim() && env.FIRSTREP_OWNER_EMAIL?.trim() &&
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.cloudflareaccess\.com$/i.test(env.FIRSTREP_ACCESS_TEAM_DOMAIN || ''));
}

// Verify the signature, audience, issuer, lifetime, and owner. Never trust an email header alone.
export async function authenticate(request: Request, env: AccessConfig, testKey?: JWTVerifyGetKey): Promise<User | null> {
  if (!configured(env)) return null;
  const token = request.headers.get('cf-access-jwt-assertion');
  if (!token || token.length > 16384) return null;
  const issuer = `https://${env.FIRSTREP_ACCESS_TEAM_DOMAIN}`;
  let keys = testKey || keySets.get(issuer);
  if (!keys) {
    const remoteKeys = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    keySets.set(issuer, remoteKeys);
    keys = remoteKeys;
  }
  try {
    const { payload } = await jwtVerify(token, keys, {
      issuer, audience: env.FIRSTREP_ACCESS_AUD!.trim(), algorithms: ['RS256'],
      requiredClaims: ['sub', 'email', 'exp', 'iat'], clockTolerance: 5,
    });
    if (typeof payload.sub !== 'string' || !payload.sub || typeof payload.email !== 'string' ||
      payload.email.toLowerCase() !== env.FIRSTREP_OWNER_EMAIL!.trim().toLowerCase()) return null;
    return { userId: payload.sub, email: payload.email };
  } catch { return null; }
}
