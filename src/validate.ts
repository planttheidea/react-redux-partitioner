import {
  PARTITION,
  SELECTABLE_PARTITION,
  SELECT_PARTITION,
  STATEFUL_PARTITION,
  UPDATE_PARTITION,
} from './flags';

import type {
  AnyPartition,
  AnySelectablePartition,
  AnySelector,
  AnySelectPartition,
  AnyStatefulPartition,
  AnyUpdatePartition,
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

export function isPartition(value: any): value is AnyPartition {
  return typeof value === 'function' && !!(value.f & PARTITION);
}

export function isPartitionAction(value: any): value is PartitionAction {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.$$part === 'number'
  );
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

export function isSelectablePartition(
  value: any
): value is AnySelectablePartition {
  return typeof value === 'function' && !!(value.f & SELECTABLE_PARTITION);
}

export function isSelectablePartitionsList(
  value: any
): value is AnyStatefulPartition[] {
  return Array.isArray(value) && isSelectablePartition(value[0]);
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

export function isStatefulPartitionsList(
  value: any
): value is AnyStatefulPartition[] {
  return Array.isArray(value) && isStatefulPartition(value[0]);
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

export function isUpdatePartition(value: any): value is AnyUpdatePartition {
  return typeof value === 'function' && !!(value.f & UPDATE_PARTITION);
}

export function isUpdater(value: any): value is AnyUpdater {
  return typeof value === 'function';
}
