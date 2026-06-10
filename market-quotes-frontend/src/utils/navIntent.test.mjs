import assert from 'node:assert/strict';
import { resolveMobileNavIntent, resolveMobileTabIntent } from './navIntent.js';

const cases = [
  {
    name: 'ProNav Home → home tab',
    input: { view: 'explore', navId: 'home' },
    expect: { view: 'explore', mobileTab: 'home' },
  },
  {
    name: 'ProNav Crypto → markets + type',
    input: { view: 'explore', type: 'crypto', navId: 'crypto' },
    expect: { view: 'explore', mobileTab: 'markets', type: 'crypto' },
  },
  {
    name: 'Info tab',
    input: { view: 'info', navId: 'info' },
    expect: { view: 'info', mobileTab: null },
  },
  {
    name: 'Forecast CTA',
    input: { view: 'forecast', navId: 'forecast' },
    expect: { view: 'forecast', mobileTab: null },
  },
  {
    name: 'Analysis workflow',
    input: { view: 'analysis' },
    expect: { view: 'analysis', mobileTab: null },
  },
  {
    name: 'Advice workflow',
    input: { view: 'advice' },
    expect: { view: 'advice', mobileTab: null },
  },
  {
    name: 'Bottom Mercati tab',
    input: resolveMobileTabIntent('markets'),
    expect: { view: 'explore', mobileTab: 'markets' },
  },
  {
    name: 'Bottom Preferiti tab',
    input: resolveMobileTabIntent('favorites'),
    expect: { view: 'explore', mobileTab: 'favorites' },
  },
];

for (const c of cases) {
  const intent =
    c.input.view != null && !c.input.mobileTab
      ? resolveMobileNavIntent(c.input)
      : c.input.mobileTab
        ? c.input
        : resolveMobileNavIntent(c.input);
  assert.equal(intent.view, c.expect.view, `${c.name}: view`);
  if ('mobileTab' in c.expect) {
    assert.equal(intent.mobileTab, c.expect.mobileTab, `${c.name}: mobileTab`);
  }
  if (c.expect.type) {
    assert.equal(intent.type, c.expect.type, `${c.name}: type`);
  }
}

console.log(`navIntent: ${cases.length} CTA routes OK`);
