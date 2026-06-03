/**
 * Handler Netlify — NON importare server.js staticamente (esbuild lo bundla e rompe ESM).
 * server.js + lib/ sono in included_files e caricati a runtime da /var/task.
 */
import path from 'path';
import { pathToFileURL } from 'url';
import serverless from 'serverless-http';

let appHandler;

async function loadApp() {
  const serverPath = path.join(process.cwd(), 'server.js');
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
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: err.message || 'Errore function API',
      }),
    };
  }
};
