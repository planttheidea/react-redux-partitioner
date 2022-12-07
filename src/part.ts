import { IGNORE_ALL_DEPENDENCIES } from './constants';
import {
  COMPOSED_PART,
  PRIMITIVE_PART,
  PROXY_PART,
  SELECT_PART,
  UPDATE_PART,
} from './flags';
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
  GetState,
  IsEqual,
  PartAction,
  PrimitivePart,
  PrimitivePartConfig,
  SelectPartArgs,
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

function createBoundSelector<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends AnySelector<Parts>
>(parts: Parts, get: Selector, isEqual: IsEqual<ReturnType<Selector>>) {
  let values: SelectPartArgs<Parts>;
  let result: ReturnType<Selector>;

  return function select(getState: GetState): ReturnType<Selector> {
    const nextValues = [] as SelectPartArgs<Parts>;

    let hasChanged = !values;

    for (let index = 0; index < parts.length; ++index) {
      nextValues[index] = parts[index].g(getState);

      hasChanged = hasChanged || !is(values[index], nextValues[index]);
    }

    values = nextValues;

    if (hasChanged) {
      const nextResult = get(...nextValues);

      if (!isEqual(result, nextResult)) {
        result = nextResult;
      }
    }

    return result;
  };
}

function createComposedReducer<State>(
  name: keyof State,
  originalReducer: Reducer
) {
  return function reduce(state: State, action: AnyAction): State {
    const nextState = originalReducer(state[name], action);

    return is(state, nextState) ? state : { ...state, [name]: nextState };
  };
}

function createStatefulGet<Part extends AnyStatefulPart>(part: Part) {
  return function get(getState: GetState): Part['i'] {
    const path = part.p;

    let state: any = getState();

    for (let index = 0, length = path.length; index < length; ++index) {
      state = state[path[index]];
    }

    return state;
  };
}

function createUnboundSelector<Selector extends AnyGenericSelector>(
  get: Selector,
  isEqual: IsEqual<ReturnType<Selector>>
) {
  let result: ReturnType<Selector>;

  return function select(getState: GetState): ReturnType<Selector> {
    const nextResult = get(getState);

    if (!isEqual(result, nextResult)) {
      result = nextResult;
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

function getDescendantSelectDependents(parts: readonly AnySelectablePart[]) {
  return parts.reduce((dependents, part) => {
    part.d.forEach((partDependent) => {
      if (isSelectPart(partDependent) || isProxyPart(partDependent)) {
        updateUniqueList(dependents, partDependent);
      }
    });

    if (isStatefulPart(part)) {
      dependents.push(...getDescendantSelectDependents(part.c));
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

function updateSelectableDependencies(
  dependencies: readonly AnySelectablePart[],
  part: AnySelectablePart
) {
  dependencies.forEach((dependency) => {
    updateUniqueList(dependency.d, part);

    // If the item is a nested state value, traverse up
    // its stateful dependents to ensure any updates to
    // state ancestors also trigger listeners.
    dependency.d.forEach((dependencyDependent) => {
      if (isStatefulPart(dependencyDependent)) {
        updateUniqueList(dependencyDependent.d, part);
      }
    });
  });
}

function updateStatefulDependencies<State>(
  dependencies: readonly AnyStatefulPart[],
  part: AnyStatefulPart,
  name: string
) {
  dependencies.forEach((dependency) => {
    const path = [name, ...dependency.p];
    const reducer = createComposedReducer<State>(
      dependency.o as keyof State,
      dependency.r
    );
    const type = getPrefixedType(path, dependency.t);

    dependency.o = name;
    dependency.p = path;
    dependency.r = reducer;
    dependency.t = type;

    updateUniqueList(dependency.d, part);
    updateStatefulDependencies<State>(dependency.c, part, name);
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

  part.id = getId(name);
  part.toString = () => part.t;
  part.update = createPartUpdater(part);

  part.c = [...parts];
  part.d = getDescendantSelectDependents(parts);
  part.f = COMPOSED_PART as ComposedPart<Name, Parts>['f'];
  part.g = createStatefulGet(part);
  part.i = initialState;
  part.n = name;
  part.o = name;
  part.p = [name];
  part.r = (state: State = initialState, action: any) =>
    action.$$part === part.id && !is(state, action.value)
      ? { ...state, ...action.value }
      : state;
  part.s = (dispatch, getState, update) => {
    const nextValue = isFunctionalUpdate<State>(update)
      ? update(part.g(getState))
      : update;

    return dispatch(part(nextValue));
  };
  part.t = `UPDATE_${toScreamingSnakeCase(name)}`;

  updateStatefulDependencies<State>(parts, part, name);

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

  part.id = getId(name);
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
  part.r = (state: State = initialState, action: any) =>
    action.$$part === part.id && !is(state, action.value)
      ? action.value
      : state;
  part.s = (dispatch, getState, update) => {
    const nextValue = isFunctionalUpdate<State>(update)
      ? update(part.g(getState))
      : update;

    return dispatch(part(nextValue));
  };
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

  part.id = getId('BoundSelectPart');

  part.b = true;
  part.d = [];
  part.f = SELECT_PART as BoundSelectPart<Parts, Selector>['f'];
  part.g = select;
  part.s = noop;

  updateSelectableDependencies(parts, part);

  return part;
}

export function createUnboundSelectPart<Selector extends AnyGenericSelector>(
  config: UnboundSelectPartConfig<Selector>
): UnboundSelectPart<Selector> {
  const { get, isEqual = is } = config;

  const select = createUnboundSelector(get, isEqual);
  const part = select as UnboundSelectPart<Selector>;

  part.id = getId('UnboundSelectPart');

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

  part.id = getId('BoundProxyPart');
  part.select = select;
  part.update = update;

  part.b = true;
  part.d = [];
  part.f = PROXY_PART as BoundProxyPart<Parts, Selector, Updater>['f'];
  part.g = select;
  part.s = set;

  updateSelectableDependencies(parts, part);

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

  part.id = getId('UnboundProxyPart');
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

  part.id = getId('UpdatePart');

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

export function part<Name extends string, State>(
  name: Name,
  initialState: []
): PrimitivePart<Name, any[]>;

export function part<Name extends string, Parts extends Tuple<AnyStatefulPart>>(
  name: Name,
  parts: Parts
): ComposedPart<Name, Parts>;
export function part<Name extends string, State>(
  name: Name,
  initialState: State
): PrimitivePart<Name, State>;

export function part<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends (...args: SelectPartArgs<Parts>) => any,
  Updater extends AnyUpdater
>(
  parts: Parts,
  selector: Selector,
  updater: Updater
): BoundProxyPart<Parts, Selector, Updater>;
export function part<
  Selector extends AnyGenericSelector,
  Updater extends AnyUpdater
>(selector: Selector, updater: Updater): UnboundProxyPart<Selector, Updater>;

export function part<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends (...args: SelectPartArgs<Parts>) => any
>(parts: Parts, selector: Selector): BoundSelectPart<Parts, Selector>;
export function part<Selector extends AnyGenericSelector>(
  selector: Selector
): UnboundSelectPart<Selector>;

export function part<Updater extends AnyUpdater>(
  _: null,
  update: Updater
): UpdatePart<Updater>;

export function part<Name extends string, Parts extends Tuple<AnyStatefulPart>>(
  config: ComposedPartConfig<Name, Parts>
): ComposedPart<Name, Parts>;
export function part<Name extends string, State>(
  config: PrimitivePartConfig<Name, State>
): PrimitivePart<Name, State>;

export function part<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends AnySelector,
  Updater extends AnyUpdater
>(
  config: BoundProxyPartConfig<Parts, Selector, Updater>
): BoundProxyPart<Parts, Selector, Updater>;
export function part<
  Selector extends AnyGenericSelector,
  Updater extends AnyUpdater
>(
  config: UnboundProxyPartConfig<Selector, Updater>
): UnboundProxyPart<Selector, Updater>;

export function part<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends AnySelector
>(
  config: BoundSelectPartConfig<Parts, Selector>
): BoundSelectPart<Parts, Selector>;
export function part<Selector extends AnyGenericSelector>(
  config: UnboundSelectPartConfig<Selector>
): UnboundSelectPart<Selector>;

export function part<Updater extends AnyUpdater>(
  config: UpdatePartConfig<Updater>
): UpdatePart<Updater>;

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
  if (first === null) {
    if (isUpdater(second)) {
      return createUpdatePart({ set: second });
    }

    throw new Error('Invalid update options provided');
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

    throw new Error('Invalid select options provided');
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

  throw new Error('Invalid config provided');
}
