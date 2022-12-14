import { is } from './utils';
import { isPartAction } from './validate';

import type { Action, AnyAction, Reducer, ReducersMapObject } from 'redux';
import type {
  AnyStatefulPart,
  CombinedPartsState,
  CreateReducerConfig,
} from './types';

export function combineOtherReducers<
  OtherReducerState,
  DispatchableAction extends Action = AnyAction
>(
  reducers: ReducersMapObject<OtherReducerState, DispatchableAction>
): Reducer<OtherReducerState, DispatchableAction> {
  const reducerKeys = Object.keys(reducers);
  const finalReducers = {} as ReducersMapObject<
    OtherReducerState,
    DispatchableAction
  >;

  reducerKeys.forEach((key) => {
    if (process.env.NODE_ENV !== 'production') {
      // @ts-expect-error - Error checking
      if (typeof reducers[key] === 'undefined') {
        console.warn(`No reducer provided for key "${key}"`);
      }
    }

    if (typeof reducers[key as keyof typeof reducers] === 'function') {
      // @ts-expect-error - keys should align
      finalReducers[key] = reducers[key];
    }
  });

  const finalReducerKeys = Object.keys(finalReducers);
  const length = finalReducerKeys.length;

  return function reducer(
    state: OtherReducerState = {} as OtherReducerState,
    action: DispatchableAction
  ) {
    const nextState = {} as OtherReducerState;

    let hasChanged = false;

    for (let i = 0; i < length; i++) {
      const key = finalReducerKeys[i] as keyof OtherReducerState;
      const previousStateForKey = state[key];
      const nextStateForKey = finalReducers[key](previousStateForKey, action);

      if (typeof nextStateForKey === 'undefined') {
        const actionType = action && action.type;

        throw new Error(
          `When called with an action of type ${
            actionType ? `"${String(actionType)}"` : '(unknown type)'
          }, the part reducer for key "${String(key)}" returned undefined. ` +
            `To ignore an action, you must explicitly return the previous state. ` +
            `If you want this reducer to hold no value, you can return null instead of undefined.`
        );
      }

      nextState[key] = nextStateForKey;
      hasChanged = hasChanged || !is(previousStateForKey, nextStateForKey);
    }

    return hasChanged ? nextState : state;
  };
}

export function createReducer<
  Parts extends readonly AnyStatefulPart[],
  OtherReducerState,
  DispatchableAction extends AnyAction
>({
  otherReducer,
  partMap,
  parts,
}: CreateReducerConfig<Parts, OtherReducerState, DispatchableAction>) {
  type PartReducerState = CombinedPartsState<Parts>;
  type CombinedState = Omit<OtherReducerState, keyof PartReducerState> &
    PartReducerState;

  const partsReducer = function partsReducer(
    state: CombinedState,
    action: DispatchableAction
  ): CombinedState {
    const part = partMap[action.$$part];

    if (!part) {
      throw new ReferenceError(
        `Part with ID \`${action.$$part}\` was not provided to the partitioner for inclusion in state. ` +
          'Please add it to the list of parts provided to `createPartitioner`.'
      );
    }

    const owner = part.o;
    const prev = state[owner];
    const next = part.r(prev, action);

    return is(prev, next) ? state : { ...state, [owner]: next };
  };

  if (!otherReducer) {
    return function reducer(
      state: CombinedState = getInitialState(parts) as CombinedState,
      action: DispatchableAction
    ): CombinedState {
      return isPartAction(action) ? partsReducer(state, action) : state;
    };
  }

  const additionalReducer = isReducersMap(otherReducer)
    ? combineOtherReducers(otherReducer)
    : otherReducer;

  if (typeof additionalReducer !== 'function') {
    throw new ReferenceError(
      `\`otherReducer\` provided was expected to be a function or a map of reducers; received ${typeof otherReducer}`
    );
  }

  return function reducer(
    state: CombinedState | undefined,
    action: DispatchableAction
  ): CombinedState {
    if (state === undefined) {
      return {
        ...getInitialState(parts),
        ...additionalReducer(undefined as OtherReducerState, action),
      };
    }

    if (isPartAction(action)) {
      return partsReducer(state, action);
    }

    const nextOtherState = additionalReducer(
      state as OtherReducerState,
      action
    );

    return is(state, nextOtherState) ? state : { ...state, ...nextOtherState };
  };
}

export function getInitialState<Parts extends readonly AnyStatefulPart[]>(
  parts: Parts
) {
  type State = CombinedPartsState<Parts>;

  const initialState = {} as State;

  for (let index = 0; index < parts.length; ++index) {
    const part = parts[index];

    initialState[part.n as keyof State] = part.r(
      undefined as unknown as State,
      {}
    );
  }

  return initialState;
}

export function isReducersMap(
  value: any
): value is ReducersMapObject<any, any> {
  return typeof value === 'object';
}
