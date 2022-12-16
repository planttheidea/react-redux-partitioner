import { isFallback } from '../src/utils';

describe('utils', () => {
  it('should have a valid fallback for `Object.is`', () => {
    expect(isFallback('foo', 'foo')).toBe(true);
    expect(isFallback(NaN, NaN)).toBe(true);
    expect(isFallback(-0, +0)).toBe(false);
  });
});
