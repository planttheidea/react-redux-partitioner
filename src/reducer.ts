// @ts-expect-error - `ActionTypes` not on public redux API
import { __DO_NOT_USE__ActionTypes as ActionTypes } from 'redux';
import { getStatefulPartMap, is } from './utils';
import { isPartAction } from './validate';

import type {
  Action,
  AnyAction,
  Reducer,
  ReducersMapObject,
  StateFromReducersMapObject,
} from 'redux';
import type { AnyStatefulPart, CombinedPartsState } from './types';

export function getInitialState<Parts extends readonly AnyStatefulPart[]>(
  parts: Parts
) {
  type State = CombinedPartsState<Parts>;

  const initialState = {} as State;

  for (let index = 0; index < parts.length; ++index) {
    const part = parts[index];
    const key = part.n as keyof State;

    initialState[key] = part.i;
  }

  return initialState;
}

export function isReducersMap(
  value: any
): value is ReducersMapObject<any, any> {
  return typeof value === 'object';
}

export function combineReduxReducers<
  CombinedPartsState,
  DispatchedAction extends Action = AnyAction
>(
  reducers: ReducersMapObject<CombinedPartsState, DispatchedAction>
): Reducer<StateFromReducersMapObject<typeof reducers>, DispatchedAction> {
  type ReducerState = StateFromReducersMapObject<typeof reducers>;

  const reducerKeys = Object.keys(reducers);
  const finalReducers = {} as ReducersMapObject<ReducerState, DispatchedAction>;

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

  return function reducer(state: ReducerState, action: DispatchedAction) {
    const nextState = {} as ReducerState;

    let hasChanged = false;

    for (let i = 0; i < length; i++) {
      const key = finalReducerKeys[i] as keyof ReducerState;
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
  } as Reducer<ReducerState, DispatchedAction>;
}

export function createPartsReducer<
  Parts extends readonly AnyStatefulPart[],
  DispatchedAction extends AnyAction
>(parts: Parts) {
  type State = CombinedPartsState<Parts>;

  const partMap = getStatefulPartMap(parts);

  return function partsReducer(
    state: State = getInitialState(parts),
    action: DispatchedAction
  ): State {
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
}

export function createReducer<
  Parts extends readonly AnyStatefulPart[],
  OtherReducerState,
  DispatchedAction extends AnyAction
>(
  parts: Parts,
  otherReducer?:
    | Reducer<OtherReducerState, DispatchedAction>
    | ReducersMapObject<OtherReducerState, DispatchedAction>
    | undefined
) {
  const partsReducer = createPartsReducer(parts);

  type PartReducerState = CombinedPartsState<Parts>;
  type CombinedState = Omit<OtherReducerState, keyof PartReducerState> &
    PartReducerState;
  type OtherReducer = Reducer<OtherReducerState, DispatchedAction>;

  if (!otherReducer) {
    return function reducer(
      state: CombinedState = getInitialState(parts) as CombinedState,
      action: DispatchedAction
    ) {
      return isPartAction(action) ? partsReducer(state, action) : state;
    };
  }

  if (isReducersMap(otherReducer)) {
    otherReducer = combineReduxReducers<OtherReducerState, DispatchedAction>(
      otherReducer
    ) as OtherReducer;
  } else if (typeof otherReducer !== 'function') {
    throw new ReferenceError(
      `\`otherReducer\` provided was expected to be a function; received ${typeof otherReducer}`
    );
  }

  return function reducer(
    state: CombinedState = getInitialState(parts) as CombinedState,
    action: DispatchedAction
  ): CombinedState {
    if (isPartAction(action)) {
      return partsReducer(state, action) as CombinedState;
    }

    const nextOtherState = (otherReducer as OtherReducer)(
      state as OtherReducerState,
      action
    );

    return is(state, nextOtherState) ? state : { ...state, ...nextOtherState };
  };
}
