import type { AnyStatefulPart, PartId, PartMap } from './types';

/**
 * Implementation of the [sfc32 PRNG](https://github.com/bryc/code/blob/master/jshash/PRNGs.md#sfc32), where
 * the string basis for the seed is randomly-generated, hence making the seed itself random per-runtime.
 */
function createIdGenerator() {
  const source = Math.random().toString(16);
  const max = Number.MAX_SAFE_INTEGER || 9007199254740991;

  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;

  for (let index = 0, k; index < source.length; index++) {
    k = source.charCodeAt(index);

    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }

  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);

  let a = (h1 ^ h2 ^ h3 ^ h4) >>> 0;
  let b = (h2 ^ h1) >>> 0;
  let c = (h3 ^ h1) >>> 0;
  let d = (h4 ^ h1) >>> 0;

  return function getId(): PartId {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;

    let t = (((a + b) | 0) + d) | 0;

    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;

    return Math.floor(((t >>> 0) / 4294967296) * max) + 1;
  };
}

export function getStatefulPartMap(parts: readonly AnyStatefulPart[]): PartMap {
  let partMap = {} as PartMap;

  parts.forEach((part) => {
    partMap[part.id] = part;

    if (part.c) {
      partMap = { ...partMap, ...getStatefulPartMap(part.c) };
    }
  });

  return partMap;
}

export const getId = createIdGenerator();

export function identity<Value>(value: Value): Value {
  return value;
}

export const is =
  Object.is ||
  function is(x, y) {
    return x === y ? x !== 0 || 1 / x === 1 / y : x != x && y != y;
  };

export function noop() {}

export function toScreamingSnakeCase(string: string): string {
  return string
    .replace(/\W+/g, ' ')
    .split(/ |\B(?=[A-Z])/)
    .map((word) => word.toLowerCase())
    .join('_')
    .toUpperCase();
}

export function updateUniqueList(list: any[], item: any): void {
  if (!~list.indexOf(item)) {
    list.push(item);
  }
}
