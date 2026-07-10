/**
 * Handler Netlify — NON importare server.js staticamente (esbuild lo bundla e rompe ESM).
 * server.mjs + lib/ sono in included_files e caricati a runtime da /var/task.
 */
import path from 'path';
import { pathToFileURL } from 'url';
import serverless from 'serverless-http';

let appHandler;

async function loadApp() {
  const serverPath = path.join(process.cwd(), 'server.mjs');
  const { default: app } = await import(pathToFileURL(serverPath).href);
  return app;
}

export const handler = async (event, context) => {
  try {
    if (!appHandler) {
      appHandler = serverless(await loadApp());
    }
    return await appHandler(event, context);
  } catch (err) {
    console.error('api handler error:', err);
    const isProd =
      process.env.NODE_ENV === 'production' ||
      process.env.NETLIFY === 'true' ||
      Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: isProd ? 'Errore function API' : err.message || 'Errore function API',
      }),
    };
  }
};
