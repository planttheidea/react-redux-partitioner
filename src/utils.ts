import { FULL_STATE_DEPENDENCY } from './constants';
import type { AnySelectablePart, AnyStatefulPart, PartId } from './types';

export function getDescendantParts(
  parts: readonly AnySelectablePart[]
): AnyStatefulPart[] {
  const descendantParts: AnyStatefulPart[] = [];

  for (let index = 0; index < parts.length; ++index) {
    const part = parts[index];
    const dependencies = part.d;

    if (dependencies === FULL_STATE_DEPENDENCY) {
      return FULL_STATE_DEPENDENCY;
    }

    for (let innerIndex = 0; innerIndex < dependencies.length; ++innerIndex) {
      const dependency = dependencies[innerIndex];

      if (!~descendantParts.indexOf(dependency)) {
        descendantParts.push(dependency);
      }
    }
  }

  return descendantParts;
}

let hashId = 0;

export function getId(name: string): PartId {
  const string = `${name}_${hashId++}`;

  let index = string.length;
  let hashA = 5381;
  let hashB = 52711;
  let charCode;

  while (index--) {
    charCode = string.charCodeAt(index);

    hashA = (hashA * 33) ^ charCode;
    hashB = (hashB * 33) ^ charCode;
  }

  return (hashA >>> 0) * 4096 + (hashB >>> 0);
}

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
