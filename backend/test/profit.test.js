import test from 'node:test'; import assert from 'node:assert/strict';
import { netProfit, transportCost, rankMarkets } from '../src/services/ProfitCalculator.js';
import { toQuintal } from '../src/services/PriceService.js';
test('net profit', () => assert.equal(netProfit(2000, 10, 500), 19500));
test('transport', () => assert.equal(transportCost(100, 10, 0.3), 300));
test('ranks by net profit, not price', () => {
  const o = { lat: 15, lng: 75 };
  const r = rankMarkets([{ name: 'far', modal: 2050, lat: 18, lng: 75 }, { name: 'near', modal: 2000, lat: 15.1, lng: 75 }], o, 10, 0.3);
  assert.equal(r[0].name, 'near');
});
test('unit normalisation', () => { assert.equal(toQuintal(20, 'kg').value, 2000); assert.ok(toQuintal('x').error); assert.ok(toQuintal(5, 'bag').error); });
