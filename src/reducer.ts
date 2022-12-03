// @ts-expect-error - `ActionTypes` not on public redux API
import { __DO_NOT_USE__ActionTypes as ActionTypes } from 'redux';
import { is } from './utils';
import { isPartitionAction } from './validate';

import type {
  Action,
  AnyAction,
  Reducer,
  ReducersMapObject,
  StateFromReducersMapObject,
} from 'redux';
import type { AnyStatefulPartition, PartitionsState } from './types';

export function isReducersMap(
  value: any
): value is ReducersMapObject<any, any> {
  return typeof value === 'object';
}

export function combineReduxReducers<
  PartitionsState,
  DispatchedAction extends Action = AnyAction
>(
  reducers: ReducersMapObject<PartitionsState, DispatchedAction>
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
          }, the partition reducer for key "${String(
            key
          )}" returned undefined. ` +
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

export function createPartitionsReducer<
  Partitions extends readonly AnyStatefulPartition[],
  DispatchedAction extends AnyAction
>(partitions: Partitions) {
  type State = PartitionsState<Partitions>;

  const partitionMap: Record<string, AnyStatefulPartition> = {};
  const initialState = partitions.reduce<State>((initialState, partition) => {
    initialState[partition.n as keyof State] = partition.i;

    return initialState;
  }, {} as State);

  const allPartitions = partitions.reduce(
    (partitionList, partition) => [...partitionList, ...partition.d],
    [] as AnyStatefulPartition[]
  );

  allPartitions.forEach((partition) => {
    partitionMap[partition.id] = partition;
  });

  return function partitionsReducer(
    state: State = initialState,
    action: DispatchedAction
  ): State {
    if (!isPartitionAction(action)) {
      return state;
    }

    const partition = partitionMap[action.$$part];
    const owner = partition.o;
    const prev = state[owner];
    const next = partition.r(prev, action);

    return is(prev, next) ? state : { ...state, [owner]: next };
  };
}

export function createReducer<
  Partitions extends readonly AnyStatefulPartition[],
  OtherReducerState,
  DispatchedAction extends AnyAction
>(
  partitions: Partitions,
  otherReducer?:
    | Reducer<OtherReducerState, DispatchedAction>
    | ReducersMapObject<OtherReducerState, DispatchedAction>
    | undefined
) {
  const partitionsReducer = createPartitionsReducer(partitions);

  type PartitionReducerState = PartitionsState<Partitions>;
  type CombinedState = Omit<OtherReducerState, keyof PartitionReducerState> &
    PartitionReducerState;

  if (!otherReducer) {
    return partitionsReducer as Reducer<CombinedState, DispatchedAction>;
  }

  if (isReducersMap(otherReducer)) {
    // @ts-expect-error - PartitionsState typing is a bit wonky
    otherReducer = combineReduxReducers<OtherState, DispatchedAction>(
      otherReducer
    );
  }

  const initialState = partitionsReducer(undefined, { type: ActionTypes.INIT });

  return function reducer(
    state: CombinedState = initialState as CombinedState,
    action: DispatchedAction
  ): CombinedState {
    if (isPartitionAction(action)) {
      const nextPartitionState = partitionsReducer(state, action);

      if (!is(state, nextPartitionState)) {
        return { ...state, ...nextPartitionState };
      }
    }

    // @ts-expect-error - `otherReducer` is still not type-narrowed, for some reason.
    const nextOtherState = otherReducer(state, action);

    return is(state, nextOtherState) ? state : { ...state, ...nextOtherState };
  };
}
