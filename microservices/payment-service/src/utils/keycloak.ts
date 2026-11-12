import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

export interface KeycloakClaims {
  sub: string;
  email?: string;
  preferred_username?: string;
  realm_access?: { roles?: string[] };
  aud?: string | string[];
  iss?: string;
  exp?: number;
}

const jwks = jwksClient({
  jwksUri: process.env.KEYCLOAK_JWKS_URI || '',
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

function getSigningKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  jwks.getSigningKey(header.kid, (error, key) => {
    if (error) {
      callback(error);
      return;
    }
    callback(null, key?.getPublicKey());
  });
}

export function verifyKeycloakToken(token: string): Promise<KeycloakClaims> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getSigningKey,
      {
        algorithms: ['RS256'],
        issuer: process.env.KEYCLOAK_ISSUER,
        audience: process.env.KEYCLOAK_AUDIENCE,
      },
      (error, decoded) => {
        if (error) {
          reject(error);
          return;
        }
        if (!decoded || typeof decoded === 'string') {
          reject(new Error('Token inválido'));
          return;
        }
        resolve(decoded as KeycloakClaims);
      }
    );
  });
}

export function getEmailFromClaims(claims: KeycloakClaims): string | undefined {
  return claims.email || claims.preferred_username;
}

export function getRolesFromClaims(claims: KeycloakClaims): string[] {
  return claims.realm_access?.roles ?? [];
}
