import {
  COMPOSED_PART,
  PRIMITIVE_PART,
  SELECT_PART,
  UPDATE_PART,
} from './flags';
import {
  getDescendantParts,
  getId,
  identity,
  is,
  noop,
  toScreamingSnakeCase,
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
} from './validate';

import type { AnyAction, Dispatch, Reducer } from 'redux';
import type {
  AnyGenericSelector,
  AnyGetValue,
  AnySelectablePart,
  AnySelector,
  AnyStatefulPart,
  AnyUpdater,
  BoundSelectPart,
  BoundSelectPartConfig,
  ComposedPart,
  ComposedPartConfig,
  FunctionalUpdate,
  GetState,
  PartAction,
  PartsState,
  PrimitivePart,
  PrimitivePartConfig,
  SelectPartArgs,
  StatefulPartUpdater,
  Tuple,
  UnboundSelectPart,
  UnboundSelectPartConfig,
  UpdatePart,
  UpdatePartArgs,
  UpdatePartConfig,
} from './types';
import { ALL_DEPENDENCIES, NO_DEPENDENCIES } from './constants';

function createComposedReducer<State>(
  name: keyof State,
  originalReducer: Reducer
) {
  return function reduce(state: State, action: AnyAction): State {
    const nextState = originalReducer(state[name], action);

    return is(state, nextState) ? state : { ...state, [name]: nextState };
  };
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

export function createComposedPart<
  Name extends string,
  Parts extends Tuple<AnyStatefulPart>
>(config: ComposedPartConfig<Name, Parts>): ComposedPart<Name, Parts> {
  type State = PartsState<[...Parts]>;

  const { name, parts: baseParts } = config;

  const descendantParts = getDescendantParts(baseParts);
  const initialState = baseParts.reduce((state, childPart) => {
    state[childPart.n as keyof State] = childPart.i;

    return state;
  }, {} as State);

  descendantParts.forEach((descendantPart) => {
    const path = [name, ...descendantPart.p];
    const type = getPrefixedType(path, descendantPart.a);
    const nextReducer = createComposedReducer<State>(
      descendantPart.o,
      descendantPart.r
    );

    descendantPart.a = type;
    descendantPart.o = name;
    descendantPart.p = path;
    descendantPart.r = nextReducer;
  });

  const part: ComposedPart<Name, Parts> = function actionCreator(
    nextValue: State
  ): PartAction<State> {
    return {
      $$part: part.id,
      type: part.a,
      value: nextValue,
    };
  };

  part.id = getId(name);
  part.toString = () => part.a;
  part.update = createPartUpdater(part);

  part.a = `UPDATE_${toScreamingSnakeCase(name)}`;
  part.d = descendantParts;
  part.f = COMPOSED_PART as ComposedPart<Name, Parts>['f'];
  part.g = (getState: any) => getState(part);
  part.i = initialState;
  part.n = name;
  part.o = name;
  part.p = [name];
  part.r = (state: State = initialState, action: any) =>
    action.$$part === part.id && !is(state, action.value)
      ? { ...state, ...action.value }
      : state;
  part.s = (getState, dispatch, update) => {
    const nextValue = isFunctionalUpdate<State>(update)
      ? update(getState(part) as State)
      : update;

    return dispatch(part(nextValue));
  };

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
      type: part.a,
      value: nextValue,
    };
  };

  part.id = getId(name);
  part.toString = () => part.a;
  part.update = createPartUpdater(part);

  part.a = `UPDATE_${toScreamingSnakeCase(name)}`;
  part.d = [part];
  part.f = PRIMITIVE_PART as PrimitivePart<Name, State>['f'];
  part.g = (getState: any) => getState(part);
  part.i = initialState;
  part.n = name;
  part.o = name;
  part.p = [name];
  part.r = (state: State = initialState, action: any) =>
    action.$$part === part.id && !is(state, action.value)
      ? action.value
      : state;
  part.s = (getState, dispatch, update) => {
    const nextValue = isFunctionalUpdate<State>(update)
      ? update(getState(part) as State)
      : update;

    return dispatch(part(nextValue));
  };

  return part;
}

export function createBoundSelectPart<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends AnySelector<Parts>
>(config: BoundSelectPartConfig<Parts, Selector>) {
  const { get, isEqual = is, parts } = config;

  const select = function select(getState: GetState): ReturnType<Selector> {
    const values = parts.map(getState) as SelectPartArgs<Parts>;

    return get(...values);
  };

  const part = select as BoundSelectPart<Parts, Selector>;

  part.id = getId('SelectPart');

  part.d = getDescendantParts(parts);
  part.e = isEqual;
  part.f = SELECT_PART as BoundSelectPart<Parts, Selector>['f'];
  part.g = select;
  part.s = noop;

  return part;
}

export function createUnboundSelectPart<Selector extends AnyGenericSelector>(
  config: UnboundSelectPartConfig<Selector>
): UnboundSelectPart<Selector> {
  const { get, isEqual = is } = config;

  const select = function select(getState: GetState): ReturnType<Selector> {
    return get(getState);
  };

  const part = select as UnboundSelectPart<Selector>;

  part.id = getId('SelectPart');

  part.d = ALL_DEPENDENCIES;
  part.e = isEqual;
  part.f = SELECT_PART as UnboundSelectPart<Selector>['f'];
  part.g = select;
  part.s = noop;

  return part;
}

export function createUpdatePart<Updater extends AnyUpdater>(
  config: UpdatePartConfig<Updater>
) {
  const { set } = config;

  const update = function update(
    getState: GetState,
    dispatch: Dispatch,
    ...rest: UpdatePartArgs<Updater>
  ): ReturnType<Updater> {
    return set(getState, dispatch, ...rest);
  };

  const part = update as UpdatePart<Updater>;

  part.d = NO_DEPENDENCIES;
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
      getState: GetState,
      dispatch: Dispatch,
      ...rest: Parameters<GetValue>
    ) {
      const update = getValue(...rest);
      const nextValue = isFunctionalUpdate(update)
        ? update(getState(part))
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
    | BoundSelectPartConfig<Parts, Selector>
    | UnboundSelectPartConfig<GenericSelector>
    | UpdatePartConfig<Updater>
    | GenericSelector
    | null,
  second?: State | Parts | Selector | Updater
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

  if (isStatefulPartsList(first)) {
    if (isSelector(second)) {
      return createBoundSelectPart({ get: second, parts: first });
    }

    throw new Error('Invalid select options provided');
  }

  if (isPrimitiveConfig(first)) {
    return createPrimitivePart(first);
  }

  if (isUpdateConfig(first)) {
    return createUpdatePart(first);
  }

  if (isBoundSelectConfig(first)) {
    return createBoundSelectPart(first as any);
  }

  if (isUnboundSelectConfig(first)) {
    return createUnboundSelectPart(first as any);
  }

  if (isComposedConfig(first)) {
    return createComposedPart(first);
  }

  if (isSelector(first)) {
    return createUnboundSelectPart({ get: first });
  }

  throw new Error('Invalid config provided');
}
