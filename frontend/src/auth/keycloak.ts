import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || window.location.origin,
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'bonosverde',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'bonosverde-web',
});

let initPromise: Promise<boolean> | null = null;

export function initKeycloak() {
  if (!initPromise) {
    initPromise = keycloak.init({
      onLoad: 'check-sso',
      pkceMethod: 'S256',
      checkLoginIframe: false,
    });
  }
  return initPromise;
}

export default keycloak;
