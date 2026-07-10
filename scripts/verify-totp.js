#!/usr/bin/env node
/** Verifica TOTP RFC 6238 (offline). */
import { generateTotpSecret, totpAt, verifyTotp } from '../lib/auth/totp.js';

const secret = generateTotpSecret();
const code = totpAt(secret);
if (!/^\d{6}$/.test(code)) throw new Error('TOTP code format');
if (!verifyTotp(secret, code)) throw new Error('TOTP verify failed');
if (verifyTotp(secret, '000000')) throw new Error('TOTP should reject bad code');
console.log('✓ TOTP OK');
