import type { AnyStatefulPart, PartId, PartMap } from './types';

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

let idCounter = 0;
export function getId(): PartId {
  let id = ++idCounter;

  id = ((id >> 16) ^ id) * 0x45d9f3b;
  id = ((id >> 16) ^ id) * 0x45d9f3b;

  return (id >> 16) ^ id;
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

export function updateUniqueList(list: any[], item: any): void {
  if (!~list.indexOf(item)) {
    list.push(item);
  }
}
