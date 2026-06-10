import assert from 'node:assert/strict';
import { flattenCatalogAssets, searchCatalogAssets } from './assetSearch.js';

const catalog = {
  crypto: [
    { id: 'BTC-USD', name: 'Bitcoin', quote: { price: 67000 } },
    { id: 'ETH-USD', name: 'Ethereum', quote: { price: 3500 } },
  ],
  stock: [{ id: 'AAPL', name: 'Apple', quote: { price: 190 } }],
};

const assets = flattenCatalogAssets(catalog);

assert.equal(assets.length, 3, 'flatten catalog');
assert.deepEqual(
  searchCatalogAssets(assets, 'b').map((i) => i.id),
  ['BTC-USD'],
  'first letter b → Bitcoin'
);
assert.ok(
  searchCatalogAssets(assets, 'e').some((i) => i.id === 'ETH-USD'),
  'letter e matches Ethereum'
);
assert.equal(searchCatalogAssets(assets, 'aapl')[0]?.id, 'AAPL', 'symbol match');
assert.equal(searchCatalogAssets(assets, '')[0], undefined, 'empty query');

console.log('assetSearch: autocomplete OK');
