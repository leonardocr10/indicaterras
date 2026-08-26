// Ambiente de produção.
// O valor de apiUrl é reescrito no build por scripts/set-api-url.mjs a partir
// da variável de ambiente API_URL (configurada na Vercel, por exemplo).
export const environment = {
  production: true,
  apiUrl: '',
};
