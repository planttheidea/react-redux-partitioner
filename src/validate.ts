import {
  PART,
  PROXY_PART,
  SELECTABLE_PART,
  SELECT_PART,
  STATEFUL_PART,
  UPDATEABLE_PART,
} from './flags';

import type {
  AnyProxyPart,
  AnySelectablePart,
  AnySelector,
  AnySelectPart,
  AnyStatefulPart,
  AnyUpdateablePart,
  AnyUpdater,
  BoundProxyPartConfig,
  BoundSelectPartConfig,
  ComposedPartConfig,
  PartAction,
  PrimitivePartConfig,
  UnboundProxyPartConfig,
  UpdatePartConfig,
} from './types';

export function isBoundProxyConfig(
  value: any
): value is BoundProxyPartConfig<
  AnyStatefulPart[],
  (...args: any[]) => any,
  AnyUpdater
> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'get' in value &&
    'set' in value &&
    'parts' in value
  );
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

export function isComposedConfig(
  value: any
): value is ComposedPartConfig<string, any> {
  return typeof value === 'object' && value !== null && 'parts' in value;
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

export function isPromise(value: any): value is Promise<unknown> {
  return !!value && typeof value.then === 'function';
}

export function isProxyPart(value: any): value is AnyProxyPart {
  return !!(value && value.f & PROXY_PART);
}

export function isSelectPart(value: any): value is AnySelectPart {
  return !!(value && value.f & SELECT_PART);
}

export function isSelectablePart(value: any): value is AnySelectablePart {
  return !!(value && value.f & SELECTABLE_PART);
}

export function isSelectablePartsList(value: any): value is AnyStatefulPart[] {
  return Array.isArray(value) && isSelectablePart(value[0]);
}

export function isSelector(value: any): value is AnySelector {
  return typeof value === 'function' && !(value.f & PART);
}

export function isStatefulPart(value: any): value is AnyStatefulPart {
  return !!(value && value.f & STATEFUL_PART);
}

export function isStatefulPartsList(value: any): value is AnyStatefulPart[] {
  return Array.isArray(value) && isStatefulPart(value[0]);
}

export function isUnboundProxyConfig(
  value: any
): value is UnboundProxyPartConfig<(...args: any[]) => any, AnyUpdater> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'get' in value &&
    'set' in value &&
    !('parts' in value)
  );
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
    !('get' in value) &&
    !('parts' in value)
  );
}

export function isUpdateablePart(value: any): value is AnyUpdateablePart {
  return !!(value && value.f & UPDATEABLE_PART);
}

export function isUpdater(value: any): value is AnyUpdater {
  return typeof value === 'function' && !(value.f & PART);
}
