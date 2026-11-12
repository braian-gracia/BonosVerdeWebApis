import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

export interface KeycloakClaims {
  sub: string;
  email?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  realm_access?: { roles?: string[] };
  aud?: string | string[];
  iss?: string;
  exp?: number;
}

export interface KeycloakTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in?: number;
  token_type?: string;
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

function getAdminBaseUrl() {
  return process.env.KEYCLOAK_ADMIN_URL || 'http://keycloak:8080';
}

function getRealm() {
  return process.env.KEYCLOAK_REALM || 'bonosverde';
}

async function getServiceAccountToken(): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.KEYCLOAK_ADMIN_CLIENT_ID || 'bonosverde-admin',
    client_secret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET || '',
  });

  const response = await fetch(
    `${getAdminBaseUrl()}/realms/${getRealm()}/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    }
  );

  if (!response.ok) {
    throw new Error(`No se pudo autenticar el cliente admin de Keycloak (${response.status})`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

async function adminRequest(path: string, init: RequestInit = {}) {
  const token = await getServiceAccountToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${getAdminBaseUrl()}${path}`, { ...init, headers });

  if (!response.ok) {
    const text = await response.text();
    let message = `Error de Keycloak (${response.status})`;
    try {
      const parsed = JSON.parse(text) as { errorMessage?: string; error?: string };
      message = parsed.errorMessage || parsed.error || message;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }

  return response;
}

export interface KeycloakUser {
  id: string;
  username: string;
  email?: string;
}

export async function findKeycloakUserByEmail(email: string): Promise<KeycloakUser | null> {
  const response = await adminRequest(
    `/admin/realms/${getRealm()}/users?email=${encodeURIComponent(email)}&exact=true`
  );
  const users = (await response.json()) as KeycloakUser[];
  return users[0] ?? null;
}

async function getRealmRole(roleName: string) {
  const response = await adminRequest(
    `/admin/realms/${getRealm()}/roles/${encodeURIComponent(roleName)}`
  );
  return (await response.json()) as { id: string; name: string };
}

export async function createKeycloakUser(params: {
  email: string;
  name: string;
  password: string;
  role: string;
}): Promise<KeycloakUser> {
  const parts = params.name.trim().split(/\s+/);
  const firstName = parts[0] || params.email;
  const lastName = parts.slice(1).join(' ') || 'BonosVerde';

  const response = await adminRequest(`/admin/realms/${getRealm()}/users`, {
    method: 'POST',
    body: JSON.stringify({
      username: params.email,
      email: params.email,
      firstName,
      lastName,
      enabled: true,
      emailVerified: true,
      credentials: [
        {
          type: 'password',
          value: params.password,
          temporary: false,
        },
      ],
    }),
  });

  const location = response.headers.get('location');
  const userId = location?.split('/').pop();
  const user = userId
    ? { id: userId, username: params.email, email: params.email }
    : await findKeycloakUserByEmail(params.email);

  if (!user) {
    throw new Error('Keycloak no devolvió el usuario creado');
  }

  try {
    const role = await getRealmRole(params.role);
    await adminRequest(`/admin/realms/${getRealm()}/users/${user.id}/role-mappings/realm`, {
      method: 'POST',
      body: JSON.stringify([role]),
    });
  } catch (error) {
    await adminRequest(`/admin/realms/${getRealm()}/users/${user.id}`, {
      method: 'DELETE',
    }).catch(() => undefined);
    throw error;
  }

  return user;
}

export async function updateKeycloakUserRole(email: string, roleName: string) {
  const user = await findKeycloakUserByEmail(email);
  if (!user) {
    throw new Error('Usuario no encontrado en Keycloak');
  }

  const rolesResponse = await adminRequest(
    `/admin/realms/${getRealm()}/users/${user.id}/role-mappings/realm`
  );
  const currentRoles = (await rolesResponse.json()) as Array<{ id: string; name: string }>;
  const managedRoles = currentRoles.filter((role) =>
    ['INVESTOR', 'PREMIUM', 'ADMIN'].includes(role.name)
  );

  if (managedRoles.length > 0) {
    await adminRequest(
      `/admin/realms/${getRealm()}/users/${user.id}/role-mappings/realm`,
      {
        method: 'DELETE',
        body: JSON.stringify(managedRoles),
      }
    );
  }

  const newRole = await getRealmRole(roleName);
  await adminRequest(`/admin/realms/${getRealm()}/users/${user.id}/role-mappings/realm`, {
    method: 'POST',
    body: JSON.stringify([newRole]),
  });
}

export async function deleteKeycloakUser(email: string) {
  const user = await findKeycloakUserByEmail(email);
  if (!user) return;

  await adminRequest(`/admin/realms/${getRealm()}/users/${user.id}`, {
    method: 'DELETE',
  });
}

export async function setKeycloakPassword(email: string, password: string) {
  const user = await findKeycloakUserByEmail(email);
  if (!user) {
    throw new Error('Usuario no encontrado en Keycloak');
  }

  await adminRequest(`/admin/realms/${getRealm()}/users/${user.id}/reset-password`, {
    method: 'PUT',
    body: JSON.stringify({
      type: 'password',
      value: password,
      temporary: false,
    }),
  });
}

async function requestToken(body: URLSearchParams): Promise<KeycloakTokenResponse> {
  const response = await fetch(
    `${getAdminBaseUrl()}/realms/${getRealm()}/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    }
  );

  if (!response.ok) {
    let message = 'Credenciales inválidas';
    try {
      const data = (await response.json()) as { error_description?: string; error?: string };
      message = data.error_description || data.error || message;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  return (await response.json()) as KeycloakTokenResponse;
}

export function loginWithPassword(email: string, password: string) {
  return requestToken(
    new URLSearchParams({
      grant_type: 'password',
      client_id: process.env.KEYCLOAK_CLI_CLIENT_ID || 'bonosverde-cli',
      client_secret: process.env.KEYCLOAK_CLI_CLIENT_SECRET || '',
      username: email,
      password,
      scope: 'openid profile email',
    })
  );
}

export function refreshKeycloakToken(refreshToken: string) {
  return requestToken(
    new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.KEYCLOAK_CLI_CLIENT_ID || 'bonosverde-cli',
      client_secret: process.env.KEYCLOAK_CLI_CLIENT_SECRET || '',
      refresh_token: refreshToken,
    })
  );
}

export function decodeAccessToken(token: string): KeycloakClaims {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded === 'string') {
    throw new Error('Token de acceso inválido');
  }
  return decoded as KeycloakClaims;
}
