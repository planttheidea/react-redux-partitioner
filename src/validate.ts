import {
  PART,
  SELECTABLE_PART,
  SELECT_PART,
  STATEFUL_PART,
  UPDATE_PART,
} from './flags';

import type {
  AnyPart,
  AnySelectablePart,
  AnySelector,
  AnySelectPart,
  AnyStatefulPart,
  AnyUpdatePart,
  AnyUpdater,
  BoundSelectPartConfig,
  ComposedPartConfig,
  PartAction,
  PrimitivePartConfig,
  UpdatePartConfig,
} from './types';

export function isComposedConfig(
  value: any
): value is ComposedPartConfig<string, any> {
  return typeof value === 'object' && value !== null && 'parts' in value;
}

export function isPart(value: any): value is AnyPart {
  return typeof value === 'function' && !!(value.f & PART);
}

export function isPartAction(value: any): value is PartAction {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.$$part === 'number'
  );
}

export function isPrimitiveConfig(
  value: any
): value is PrimitivePartConfig<string, any> {
  return typeof value === 'object' && value !== null && 'initialState' in value;
}

export function isBoundSelectConfig(
  value: any
): value is BoundSelectPartConfig<AnyStatefulPart[], (...args: any[]) => any> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'get' in value &&
    !('set' in value) &&
    'parts' in value
  );
}

export function isSelectablePart(value: any): value is AnySelectablePart {
  return typeof value === 'function' && !!(value.f & SELECTABLE_PART);
}

export function isSelectablePartsList(value: any): value is AnyStatefulPart[] {
  return Array.isArray(value) && isSelectablePart(value[0]);
}

export function isSelectPart(value: any): value is AnySelectPart {
  return typeof value === 'function' && !!(value.f & SELECT_PART);
}

export function isSelector(value: any): value is AnySelector {
  return typeof value === 'function';
}

export function isStatefulPart(value: any): value is AnyStatefulPart {
  return typeof value === 'function' && !!(value.f & STATEFUL_PART);
}

export function isStatefulPartsList(value: any): value is AnyStatefulPart[] {
  return Array.isArray(value) && isStatefulPart(value[0]);
}

export function isUnboundSelectConfig(
  value: any
): value is BoundSelectPartConfig<AnyStatefulPart[], (...args: any[]) => any> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'get' in value &&
    !('set' in value) &&
    !('parts' in value)
  );
}

export function isUpdateConfig(
  value: any
): value is UpdatePartConfig<AnyUpdater> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'set' in value &&
    !('get' in value)
  );
}

export function isUpdatePart(value: any): value is AnyUpdatePart {
  return typeof value === 'function' && !!(value.f & UPDATE_PART);
}

export function isUpdater(value: any): value is AnyUpdater {
  return typeof value === 'function';
}
