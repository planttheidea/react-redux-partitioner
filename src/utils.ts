import { ReducersMapObject } from 'redux';
import {
  READ_ONLY_PARTITION,
  READ_WRITE_PARTITION,
  UPDATE_PARTITION,
} from './flags';

import type {
  AnySelectPartition,
  AnyUpdatePartition,
  AnyStatefulPartition,
  AnyStatefulPartitionAction,
} from './internalTypes';

export function getDescendantPartitions(
  partitions: AnyStatefulPartition[] | readonly AnyStatefulPartition[]
): AnyStatefulPartition[] {
  const descendantPartitions: AnyStatefulPartition[] = [];

  partitions.forEach((partition) => {
    partition.d.forEach((descendantPartition) => {
      if (!~descendantPartitions.indexOf(partition)) {
        descendantPartitions.push(descendantPartition);
      }
    });
  });

  return descendantPartitions;
}

let hashId = 0;

export function getId(name: string) {
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

export const is =
  Object.is ||
  function is(x, y) {
    return x === y ? x !== 0 || 1 / x === 1 / y : x != x && y != y;
  };

export function isReducersMap(
  value: any
): value is ReducersMapObject<any, any> {
  return typeof value === 'object';
}

export function isSelectPartition(value: any): value is AnySelectPartition {
  return !!(value && READ_ONLY_PARTITION & value.t);
}

export function isPartitionAction(
  value: any
): value is AnyStatefulPartitionAction {
  return !!(value && value.$$part);
}

export function isStatefulPartition(value: any): value is AnyStatefulPartition {
  return !!(value && READ_WRITE_PARTITION & value.t);
}

export function isUpdatePartition(value: any): value is AnyUpdatePartition {
  return !!(value && UPDATE_PARTITION & value.t);
}

export function toScreamingSnakeCase(string: string): string {
  return string
    .replace(/\W+/g, ' ')
    .split(/ |\B(?=[A-Z])/)
    .map((word) => word.toLowerCase())
    .join('_')
    .toUpperCase();
}
