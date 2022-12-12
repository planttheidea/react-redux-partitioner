import { IGNORE_ALL_DEPENDENCIES } from './constants';
import {
  COMPOSED_PART,
  PRIMITIVE_PART,
  PROXY_PART,
  SELECT_PART,
  UPDATE_PART,
} from './flags';
import {
  getSuspensePromise,
  getSuspensePromiseCacheEntry,
} from './suspensePromise';
import {
  getId,
  identity,
  is,
  noop,
  toScreamingSnakeCase,
  updateUniqueList,
} from './utils';
import {
  isBoundSelectConfig,
  isComposedConfig,
  isStatefulPartsList,
  isPrimitiveConfig,
  isSelector,
  isUnboundSelectConfig,
  isUpdateConfig,
  isUpdater,
  isBoundProxyConfig,
  isUnboundProxyConfig,
  isSelectablePartsList,
  isStatefulPart,
  isSelectPart,
  isProxyPart,
  isPromise,
} from './validate';

import type { AnyAction, Dispatch, Reducer } from 'redux';
import type {
  AnyGenericSelector,
  AnyGetValue,
  AnySelectablePart,
  AnySelector,
  AnyStatefulPart,
  AnyUpdater,
  BoundProxyPart,
  BoundProxyPartConfig,
  BoundSelectPart,
  BoundSelectPartConfig,
  CombinedPartsState,
  ComposedPart,
  ComposedPartConfig,
  FunctionalUpdate,
  Get,
  GetState,
  IsEqual,
  MaybePromise,
  PartAction,
  PrimitivePart,
  PrimitivePartConfig,
  SelectPartArgs,
  Set,
  StatefulPartUpdater,
  Tuple,
  UnboundProxyPart,
  UnboundProxyPartConfig,
  UnboundSelectPart,
  UnboundSelectPartConfig,
  UpdatePart,
  UpdatePartArgs,
  UpdatePartConfig,
} from './types';

function cancelRunningSuspensePromise(promise: Promise<unknown>): void {
  const entry = isPromise(promise) && getSuspensePromiseCacheEntry(promise);

  if (entry) {
    entry.c();
  }
}

function createBoundSelector<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends AnySelector<Parts>
>(parts: Parts, get: Selector, isEqual: IsEqual) {
  type Values = SelectPartArgs<Parts>;
  type Result = MaybePromise<ReturnType<Selector>>;

  let values: Values;
  let result: Result;
  let stateVersion: number;

  return function select(getState: GetState): Result {
    // @ts-expect-error - v is a hidden method to check the version of state.
    const nextVersion = getState.v();

    if (nextVersion === stateVersion) {
      return result;
    }

    stateVersion = nextVersion;

    const nextValues = [] as Values;

    let hasChanged = !values;
    let hasPromise = false;

    for (let index = 0; index < parts.length; ++index) {
      nextValues[index] = parts[index].g(getState);

      hasChanged = hasChanged || !is(values[index], nextValues[index]);
      hasPromise = hasPromise || isPromise(nextValues[index]);
    }

    values = nextValues;

    if (hasChanged) {
      cancelRunningSuspensePromise(result);

      if (hasPromise) {
        const nextResult: Promise<ReturnType<Selector>> = Promise.all(
          nextValues
        ).then((resolvedValues) => get(...(resolvedValues as Values)));

        result = getSuspensePromise(nextResult);
      } else {
        let nextResult = get(...nextValues);

        if (isPromise(nextResult)) {
          nextResult = getSuspensePromise(nextResult);
        }

        if (result === undefined || !isEqual(result, nextResult)) {
          result = nextResult;
        }
      }
    }

    return result;
  };
}

function createComposedReducer<Part extends AnyStatefulPart>(
  part: Part
): Reducer<Part['i'], AnyAction> {
  type State = Part['i'];

  const { i: initialState, o: name, r: originalReducer } = part;

  return function reduce(
    state: State = initialState,
    action: AnyAction
  ): State {
    const prevState = state[name];
    const nextState = originalReducer(prevState, action);

    return is(prevState, nextState) ? state : { ...state, [name]: nextState };
  };
}

function createStatefulGet<Part extends AnyStatefulPart>(
  part: Part
): Get<Part['i']> {
  return function get(getState: GetState): Part['i'] {
    const path = part.p;

    let state: any = getState();

    for (let index = 0, length = path.length; index < length; ++index) {
      state = state[path[index]];
    }

    return state;
  };
}

function createStatefulReduce<Part extends AnyStatefulPart>(
  part: Part
): Reducer<Part['i'], AnyAction> {
  return function reduce(state: Part['i'] = part.i, action: any) {
    return action.$$part === part.id && !is(state, action.value)
      ? action.value
      : state;
  };
}

function createStatefulSet<Part extends AnyStatefulPart>(
  part: Part
): Set<Part['i']> {
  return function set(dispatch, getState, update) {
    const nextValue = isFunctionalUpdate<Part['i']>(update)
      ? update(part.g(getState))
      : update;

    return dispatch(part(nextValue));
  };
}

function createUnboundSelector<Selector extends AnyGenericSelector>(
  get: Selector,
  isEqual: IsEqual
) {
  let result: ReturnType<Selector>;
  let stateVersion: number;

  return function select(getState: GetState): ReturnType<Selector> {
    // @ts-expect-error - v is a hidden method to check the version of state.
    const nextVersion = getState.v();

    if (nextVersion === stateVersion) {
      return result;
    }

    stateVersion = nextVersion;

    const nextResult = get(getState);

    if (!isEqual(result, nextResult)) {
      cancelRunningSuspensePromise(result);

      result = isPromise(nextResult)
        ? getSuspensePromise(nextResult)
        : nextResult;
    }

    return result;
  };
}

function createUpdate<Updater extends AnyUpdater>(set: Updater) {
  return function update(...rest: UpdatePartArgs<Updater>) {
    return (dispatch: Dispatch, getState: GetState) =>
      set(dispatch, getState, ...rest);
  };
}

function getAllDescendantDependents(parts: readonly AnySelectablePart[]) {
  return parts.reduce((dependents, part) => {
    part.d.forEach((partDependent) => {
      if (isSelectPart(partDependent) || isProxyPart(partDependent)) {
        updateUniqueList(dependents, partDependent);
      }
    });

    if (isStatefulPart(part)) {
      dependents.push(...getAllDescendantDependents(part.c));
    }

    return dependents;
  }, [] as AnySelectablePart[]);
}

function getPrefixedType(path: string[], type: string): string {
  const prefix = path.slice(0, path.length - 1).join('.');
  const splitType = type.split('/');
  const baseType = splitType[splitType.length - 1];

  return prefix ? `${prefix}/${baseType}` : baseType;
}

function isFunctionalUpdate<State>(
  value: any
): value is FunctionalUpdate<State> {
  return typeof value === 'function';
}

function updateSelectableDependents(
  dependents: readonly AnySelectablePart[],
  part: AnySelectablePart
) {
  dependents.forEach((dependent) => {
    updateUniqueList(dependent.d, part);

    // If the item is a nested state value, traverse up
    // its stateful dependents to ensure any updates to
    // state ancestors also trigger listeners.
    dependent.d.forEach((descendant) => {
      if (isStatefulPart(descendant)) {
        updateUniqueList(descendant.d, part);
      }
    });
  });
}

function updateStatefulDependents<State>(
  dependents: readonly AnyStatefulPart[],
  part: AnyStatefulPart,
  name: string
) {
  dependents.forEach((dependent) => {
    const path = [name, ...dependent.p];
    const reducer = createComposedReducer(dependent);
    const type = getPrefixedType(path, dependent.t);

    dependent.o = name;
    dependent.p = path;
    dependent.r = reducer;
    dependent.t = type;

    updateUniqueList(dependent.d, part);
    updateStatefulDependents<State>(dependent.c, part, name);
  });
}

export function createComposedPart<
  Name extends string,
  Parts extends Tuple<AnyStatefulPart>
>(config: ComposedPartConfig<Name, Parts>): ComposedPart<Name, Parts> {
  type State = CombinedPartsState<[...Parts]>;

  const { name, parts } = config;

  const initialState = parts.reduce((state, childPart) => {
    state[childPart.n as keyof State] = childPart.i;

    return state;
  }, {} as State);

  const part: ComposedPart<Name, Parts> = function actionCreator(
    nextValue: State
  ): PartAction<State> {
    return {
      $$part: part.id,
      type: part.t,
      value: nextValue,
    };
  };

  part.id = getId();
  part.toString = () => part.t;
  part.update = createPartUpdater(part);

  part.c = [...parts];
  part.d = getAllDescendantDependents(parts);
  part.f = COMPOSED_PART as ComposedPart<Name, Parts>['f'];
  part.g = createStatefulGet(part);
  part.i = initialState;
  part.n = name;
  part.o = name;
  part.p = [name];
  part.r = createStatefulReduce(part);
  part.s = createStatefulSet(part);
  part.t = `UPDATE_${toScreamingSnakeCase(name)}`;

  updateStatefulDependents<State>(parts, part, name);

  return part;
}

export function createPrimitivePart<Name extends string, State>(
  config: PrimitivePartConfig<Name, State>
): PrimitivePart<Name, State> {
  const { initialState, name } = config;

  const part: PrimitivePart<Name, State> = function actionCreator(
    nextValue: State
  ): PartAction<State> {
    return {
      $$part: part.id,
      type: part.t,
      value: nextValue,
    };
  };

  part.id = getId();
  part.toString = () => part.t;
  part.update = createPartUpdater(part);

  part.c = [];
  part.d = [];
  part.f = PRIMITIVE_PART as PrimitivePart<Name, State>['f'];
  part.g = createStatefulGet(part);
  part.i = initialState;
  part.n = name;
  part.o = name;
  part.p = [name];
  part.r = createStatefulReduce(part);
  part.s = createStatefulSet(part);
  part.t = `UPDATE_${toScreamingSnakeCase(name)}`;

  return part;
}

export function createBoundSelectPart<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends AnySelector<Parts>
>(config: BoundSelectPartConfig<Parts, Selector>) {
  const { get, isEqual = is, parts } = config;

  const select = createBoundSelector(parts, get, isEqual);
  const part = select as BoundSelectPart<Parts, Selector>;

  part.id = getId();

  part.b = true;
  part.d = [];
  part.f = SELECT_PART as BoundSelectPart<Parts, Selector>['f'];
  part.g = select;
  part.s = noop;

  updateSelectableDependents(parts, part);

  return part;
}

export function createUnboundSelectPart<Selector extends AnyGenericSelector>(
  config: UnboundSelectPartConfig<Selector>
): UnboundSelectPart<Selector> {
  const { get, isEqual = is } = config;

  const select = createUnboundSelector(get, isEqual);
  const part = select as UnboundSelectPart<Selector>;

  part.id = getId();

  part.b = false;
  part.d = [];
  part.f = SELECT_PART as UnboundSelectPart<Selector>['f'];
  part.g = select;
  part.s = noop;

  return part;
}

export function createBoundProxyPart<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends AnySelector<Parts>,
  Updater extends AnyUpdater
>(
  config: BoundProxyPartConfig<Parts, Selector, Updater>
): BoundProxyPart<Parts, Selector, Updater> {
  const { get, isEqual = is, parts, set } = config;

  const select = createBoundSelector(parts, get, isEqual);
  const update = createUpdate(set);

  const part = {} as BoundProxyPart<Parts, Selector, Updater>;

  part.id = getId();
  part.select = select;
  part.update = update;

  part.b = true;
  part.d = [];
  part.f = PROXY_PART as BoundProxyPart<Parts, Selector, Updater>['f'];
  part.g = select;
  part.s = set;

  updateSelectableDependents(parts, part);

  return part;
}

export function createUnboundProxyPart<
  Selector extends AnyGenericSelector,
  Updater extends AnyUpdater
>(
  config: UnboundProxyPartConfig<Selector, Updater>
): UnboundProxyPart<Selector, Updater> {
  const { get, isEqual = is, set } = config;

  const select = createUnboundSelector(get, isEqual);
  const update = createUpdate(set);

  const part = {} as UnboundProxyPart<Selector, Updater>;

  part.id = getId();
  part.select = select;
  part.update = update;

  part.b = false;
  part.d = [];
  part.f = PROXY_PART as UnboundProxyPart<Selector, Updater>['f'];
  part.g = get;
  part.s = set;

  return part;
}

export function createUpdatePart<Updater extends AnyUpdater>(
  config: UpdatePartConfig<Updater>
): UpdatePart<Updater> {
  const { set } = config;

  const part = createUpdate(set) as UpdatePart<Updater>;

  part.id = getId();

  part.d = IGNORE_ALL_DEPENDENCIES;
  part.f = UPDATE_PART as UpdatePart<Updater>['f'];
  part.g = noop;
  part.s = set;

  return part;
}

export function createPartUpdater<Part extends AnyStatefulPart>(part: Part) {
  return function partAction<GetValue extends AnyGetValue<Part['i']>>(
    baseType: string,
    getValue: GetValue = identity as GetValue
  ) {
    let path = part.p;
    let type = getPrefixedType(path, baseType);

    function getType() {
      if (part.p !== path) {
        path = part.p;
        type = getPrefixedType(path, baseType);
      }

      return type;
    }

    function set(
      dispatch: Dispatch,
      getState: GetState,
      ...rest: Parameters<GetValue>
    ) {
      const update = getValue(...rest);
      const nextValue = isFunctionalUpdate(update)
        ? update(part.g(getState))
        : update;

      return dispatch<PartAction<Part['i']>>({
        ...part(nextValue),
        type: getType(),
      });
    }

    return createUpdatePart<typeof set>({ set });
  } as StatefulPartUpdater<Part['i']>;
}

/**
 * Creates a Part for use in Redux state.
 */
export function part<Name extends string>(
  name: Name,
  initialState: []
): PrimitivePart<Name, any[]>;

/**
 * Creates a Part for use in Redux state which is composed
 * of other Parts.
 */
export function part<Name extends string, Parts extends Tuple<AnyStatefulPart>>(
  name: Name,
  parts: Parts
): ComposedPart<Name, Parts>;
/**
 * Creates a Part for use in Redux state.
 */
export function part<Name extends string, State>(
  name: Name,
  initialState: State
): PrimitivePart<Name, State>;

/**
 * Creates a Proxy Part, which allows deriving a value based on values
 * selected from state, but also performing updates of values in state.
 * When used with `usePart`, it will update whenever the value of at
 * least one Part passed has changed.
 *
 * While the values in state selected are specific to the Parts passed,
 * the update method may be used to dispatch any action.
 */
export function part<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends (...args: SelectPartArgs<Parts>) => any,
  Updater extends AnyUpdater
>(
  parts: Parts,
  selector: Selector,
  updater: Updater
): BoundProxyPart<Parts, Selector, Updater>;
/**
 * Creates a Proxy Part, which allows deriving a value based on values
 * selected from state, but also performing updates of values in state.
 * When used with `usePart`, it will update whenever the state object
 * changes.
 *
 * This only beneficial if being used with values in state that are not
 * using Parts. If you only are concerned with values in state that are
 * Parts, you should pass an array of those Parts before the selector.
 */
export function part<
  Selector extends AnyGenericSelector,
  Updater extends AnyUpdater
>(selector: Selector, updater: Updater): UnboundProxyPart<Selector, Updater>;

/**
 * Creates a Select Part, which allows deriving a value based on values
 * selected from state. When used with `usePart`, it will update whenever
 * the value of at least one Part passed has changed.
 */
export function part<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends (...args: SelectPartArgs<Parts>) => any
>(parts: Parts, selector: Selector): BoundSelectPart<Parts, Selector>;
/**
 * Creates a Select Part, which allows deriving a value based on values
 * selected from state. When used with `usePart`, it will update whenever
 * the state object changes.
 *
 * This only beneficial if being used with values in state that are not
 * using Parts. If you only are concerned with values in state that are
 * Parts, you should pass an array of those Parts before the selector.
 */
export function part<Selector extends AnyGenericSelector>(
  selector: Selector
): UnboundSelectPart<Selector>;

/**
 * Creates an Update Part, which allows performing updates of values in
 * state. When used with `usePart`, it itself will never trigger an update.
 * As such, it is recommended to use this with `usePartUpdate` instead of
 * `usePart`.
 */
export function part<Updater extends AnyUpdater>(
  _: null,
  update: Updater
): UpdatePart<Updater>;

/**
 * Creates a Part for use in Redux state which is composed
 * of other Parts.
 */
export function part<Name extends string, Parts extends Tuple<AnyStatefulPart>>(
  config: ComposedPartConfig<Name, Parts>
): ComposedPart<Name, Parts>;
/**
 * Creates a Part for use in Redux state.
 */
export function part<Name extends string, State>(
  config: PrimitivePartConfig<Name, State>
): PrimitivePart<Name, State>;

/**
 * Creates a Proxy Part, which allows deriving a value based on values
 * selected from state, but also performing updates of values in state.
 * When used with `usePart`, it will update whenever the value of at
 * least one Part passed has changed.
 *
 * While the values in state selected are specific to the Parts passed,
 * the update method may be used to dispatch any action.
 */
export function part<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends AnySelector<Parts>,
  Updater extends AnyUpdater
>(
  config: BoundProxyPartConfig<Parts, Selector, Updater>
): BoundProxyPart<Parts, Selector, Updater>;
/**
 * Creates a Proxy Part, which allows deriving a value based on values
 * selected from state, but also performing updates of values in state.
 * When used with `usePart`, it will update whenever the state object changes.
 *
 * This only beneficial if being used with values in state that are not
 * using Parts. If you only are concerned with values in state that are
 * Parts, you should pass an array of those Parts before the selector.
 */
export function part<
  Selector extends AnyGenericSelector,
  Updater extends AnyUpdater
>(
  config: UnboundProxyPartConfig<Selector, Updater>
): UnboundProxyPart<Selector, Updater>;

/**
 * Creates a Select Part, which allows deriving a value based on values
 * selected from state. When used with `usePart`, it will update whenever
 * the value of at least one Part passed has changed.
 */
export function part<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends AnySelector<Parts>
>(
  config: BoundSelectPartConfig<Parts, Selector>
): BoundSelectPart<Parts, Selector>;

// /**
//  * Creates a Select Part, which allows deriving a value based on values
//  * selected from state. When used with `usePart`, it will update whenever
//  * the state object changes.
//  *
//  * This only beneficial if being used with values in state that are not
//  * using Parts. If you only are concerned with values in state that are
//  * Parts, you should pass an array of those Parts before the selector.
//  */
// export function part<Selector extends AnyGenericSelector>(
//   config: UnboundSelectPartConfig<Selector>
// ): UnboundSelectPart<Selector>;

// /**
//  * Creates an Update Part, which allows performing updates of values in
//  * state. When used with `usePart`, it itself will never trigger an update.
//  * As such, it is recommended to use this with `usePartUpdate` instead of
//  * `usePart`.
//  */
// export function part<Updater extends AnyUpdater>(
//   config: UpdatePartConfig<Updater>
// ): UpdatePart<Updater>;

export function part<
  Name extends string,
  State,
  Parts extends Tuple<AnyStatefulPart>,
  Selector extends AnySelector<Parts>,
  GenericSelector extends AnyGenericSelector,
  Updater extends AnyUpdater
>(
  first:
    | Name
    | Parts
    | ComposedPartConfig<Name, Parts>
    | PrimitivePartConfig<Name, State>
    | BoundProxyPartConfig<Parts, Selector, Updater>
    | UnboundProxyPartConfig<GenericSelector, Updater>
    | BoundSelectPartConfig<Parts, Selector>
    | UnboundSelectPartConfig<GenericSelector>
    | UpdatePartConfig<Updater>
    | GenericSelector
    | null,
  second?: State | Parts | Selector | Updater,
  third?: Updater
) {
  if (first == null) {
    if (isUpdater(second)) {
      return createUpdatePart({ set: second });
    }

    throw new Error(
      'You provided a nullish first argument which would create an Update Part, but provided an invalid updater ' +
        `as the second argument. A function was expected; received ${typeof second}.`
    );
  }

  if (typeof first === 'string') {
    if (isStatefulPartsList(second)) {
      return createComposedPart({
        name: first,
        parts: second,
      });
    }

    return createPrimitivePart({
      name: first,
      initialState: second,
    });
  }

  if (isSelectablePartsList(first)) {
    if (isSelector(second)) {
      return isUpdater(third)
        ? createBoundProxyPart({ get: second, parts: first, set: third })
        : createBoundSelectPart({ get: second, parts: first });
    }

    throw new Error(
      'You provided a list of Parts as the first argument, which would create a Select Part, but provided ' +
        `an invalid selector as the second argument. A function was expected; received ${typeof second}.`
    );
  }

  if (isPrimitiveConfig(first)) {
    return createPrimitivePart(first);
  }

  if (isUpdateConfig(first)) {
    return createUpdatePart(first);
  }

  if (isBoundProxyConfig(first)) {
    return createBoundProxyPart(first);
  }

  if (isUnboundProxyConfig(first)) {
    return createUnboundProxyPart(first);
  }

  if (isBoundSelectConfig(first)) {
    return createBoundSelectPart(first);
  }

  if (isUnboundSelectConfig(first)) {
    return createUnboundSelectPart(first as any);
  }

  if (isComposedConfig(first)) {
    return createComposedPart(first);
  }

  if (isSelector(first)) {
    return isUpdater(second)
      ? createUnboundProxyPart({ get: first, set: second })
      : createUnboundSelectPart({ get: first });
  }

  throw new Error(
    `The parameters passed are invalid for creating a Part; received [${Array.from(
      arguments,
      (parameter) => typeof parameter
    )}]`
  );
}
