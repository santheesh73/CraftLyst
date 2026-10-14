import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseColor, contrastRatio, luminance } from '../src/color.js';

test('parses hex, rgb, hsl, oklch and keywords', () => {
  assert.deepEqual(parseColor('#fff'), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepEqual(parseColor('#00000080'), { r: 0, g: 0, b: 0, a: 128 / 255 });
  assert.deepEqual(parseColor('rgb(10, 20, 30)'), { r: 10, g: 20, b: 30, a: 1 });
  assert.deepEqual(parseColor('rgb(10 20 30 / 50%)'), { r: 10, g: 20, b: 30, a: 0.5 });
  const red = parseColor('hsl(0 100% 50%)');
  assert.ok(red && Math.round(red.r) === 255 && Math.round(red.g) === 0);
  const white = parseColor('oklch(1 0 0)');
  assert.ok(white && Math.round(white.r) === 255 && Math.round(white.b) === 255);
  assert.equal(parseColor('var(--x)'), null);
  assert.equal(parseColor('#12345'), null);
});

test('WCAG reference values', () => {
  const white = /** @type {any} */ (parseColor('#ffffff'));
  const black = /** @type {any} */ (parseColor('#000000'));
  assert.equal(contrastRatio(black, white), 21);
  // #767676 on white is the well-known smallest gray passing 4.5:1.
  assert.equal(contrastRatio(/** @type {any} */ (parseColor('#767676')), white), 4.54);
  assert.ok(contrastRatio(/** @type {any} */ (parseColor('#777777')), white) < 4.5);
  assert.equal(luminance(white), 1);
});

test('translucent foreground is composited over the background', () => {
  const white = /** @type {any} */ (parseColor('#fff'));
  const halfBlack = /** @type {any} */ (parseColor('rgb(0 0 0 / 0.5)'));
  const ratio = contrastRatio(halfBlack, white);
  assert.ok(ratio > 3 && ratio < 4.5, `got ${ratio}`);
});
