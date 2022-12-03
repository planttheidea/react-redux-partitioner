import { SELECT_PARTITION, STATEFUL_PARTITION } from './flags';

import type {
  AnySelector,
  AnySelectPartition,
  AnyStatefulPartition,
  AnyUpdater,
  ComposedPartitionConfig,
  PartitionAction,
  PrimitivePartitionConfig,
  SelectPartitionConfig,
  UpdatePartitionConfig,
} from './types';

export function isComposedConfig(
  value: any
): value is ComposedPartitionConfig<string, any> {
  return typeof value === 'object' && value !== null && 'partitions' in value;
}

export function isPartitionAction(value: any): value is PartitionAction {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.$$part === 'number'
  );
}

export function isPartitionsList(value: any): value is AnyStatefulPartition[] {
  return Array.isArray(value) && isStatefulPartition(value[0]);
}

export function isPrimitiveConfig(
  value: any
): value is PrimitivePartitionConfig<string, any> {
  return typeof value === 'object' && value !== null && 'initialState' in value;
}

export function isSelectConfig(
  value: any
): value is SelectPartitionConfig<
  AnyStatefulPartition[],
  (...args: any[]) => any
> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'get' in value &&
    !('set' in value)
  );
}

export function isSelectPartition(value: any): value is AnySelectPartition {
  return typeof value === 'function' && !!(value.f & SELECT_PARTITION);
}

export function isSelector(value: any): value is AnySelector {
  return typeof value === 'function';
}

export function isStatefulPartition(value: any): value is AnyStatefulPartition {
  return typeof value === 'function' && !!(value.f & STATEFUL_PARTITION);
}

export function isUpdateConfig(
  value: any
): value is UpdatePartitionConfig<AnyUpdater> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'set' in value &&
    !('get' in value)
  );
}

export function isUpdater(value: any): value is AnyUpdater {
  return typeof value === 'function';
}
