export function getMercadoLivreConfig() {
  const clientId = process.env.MERCADO_LIVRE_CLIENT_ID;
  const clientSecret = process.env.MERCADO_LIVRE_CLIENT_SECRET;
  const redirectUri = process.env.MERCADO_LIVRE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'MERCADO_LIVRE_CLIENT_ID, MERCADO_LIVRE_CLIENT_SECRET e MERCADO_LIVRE_REDIRECT_URI precisam estar configurados'
    );
  }

  return { clientId, clientSecret, redirectUri };
}
