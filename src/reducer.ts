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

  return function reducer(
    state: ReducerState = {} as ReducerState,
    action: DispatchedAction
  ) {
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
  const initialState = parts.reduce<State>((initialState, part) => {
    initialState[part.n as keyof State] = part.i;

    return initialState;
  }, {} as State);

  return function partsReducer(
    state: State = initialState,
    action: DispatchedAction
  ): State {
    if (!isPartAction(action)) {
      return state;
    }

    const part = partMap[action.$$part];
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

  if (!otherReducer) {
    return partsReducer as Reducer<CombinedState, DispatchedAction>;
  }

  if (isReducersMap(otherReducer)) {
    // @ts-expect-error - CombinedPartsState typing is a bit wonky
    otherReducer = combineReduxReducers<OtherState, DispatchedAction>(
      otherReducer
    );
  }

  const initialState = partsReducer(undefined, { type: ActionTypes.INIT });

  return function reducer(
    state: CombinedState = initialState as CombinedState,
    action: DispatchedAction
  ): CombinedState {
    if (isPartAction(action)) {
      const nextPartState = partsReducer(state, action);

      if (!is(state, nextPartState)) {
        return { ...state, ...nextPartState };
      }
    }

    // @ts-expect-error - `otherReducer` is still not type-narrowed, for some reason.
    const nextOtherState = otherReducer(state, action);

    return is(state, nextOtherState) ? state : { ...state, ...nextOtherState };
  };
}
