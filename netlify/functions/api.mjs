/**
 * Netlify Function — espone l'app Express su /api/* (stesso dominio del frontend).
 */
import serverless from 'serverless-http';
import app from '../../server.js';

export const handler = serverless(app);
