/**
 * Unifica config OAuth da API e variabili Vite (build-time).
 * Mostra un provider se esiste un client id (API o VITE_*); il backend valida al login.
 */
export function resolveOAuthConfig(apiConfig) {
  const googleId =
    apiConfig?.oauthClientIds?.google?.trim() ||
    import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ||
    '';
  const githubId =
    apiConfig?.oauthClientIds?.github?.trim() ||
    import.meta.env.VITE_GITHUB_CLIENT_ID?.trim() ||
    '';

  return {
    oauth: {
      google: Boolean(googleId),
      github: Boolean(githubId),
    },
    oauthClientIds: {
      google: googleId || null,
      github: githubId || null,
    },
  };
}

export function hasOAuthProviders(config) {
  return Boolean(config?.oauth?.google || config?.oauth?.github);
}
