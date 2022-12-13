import type { Action, AnyAction, Reducer, ReducersMapObject } from 'redux';
import type { Enhancer } from './enhancer';
import type { AnyStatefulPart, CombinedPartsState, PartId } from './part';
import type { Notifier } from './subscription';

export interface PartitionerOptions<
  Parts extends readonly AnyStatefulPart[],
  OtherReducerState = unknown,
  DispatchableAction extends Action = AnyAction
> {
  /**
   * Custom notifier, which receives the method by which state update subscribers are notified
   * and calls this method when desired. Often used for batching updates.
   */
  notifier?: Notifier;
  /**
   * The list of Parts that will be the top-most state in the store.
   */
  parts: Parts;
  /**
   * Additional reducers used by the store which are not themselves parts. This can either be
   * a pre-built reducer function, or a map of reducers that would normally be passed to `redux`'s
   * `combineReducers` method.
   */
  otherReducer?:
    | Reducer<OtherReducerState, DispatchableAction>
    | ReducersMapObject<OtherReducerState, DispatchableAction>
    | undefined;
}

export interface PartMap {
  [$$part: PartId]: AnyStatefulPart;
}

export interface Partitioner<
  Parts extends readonly AnyStatefulPart[],
  OtherReducerState,
  DispatchableAction extends AnyAction
> {
  enhancer: Enhancer<Parts, DispatchableAction>;
  reducer: Reducer<
    Omit<OtherReducerState, keyof CombinedPartsState<Parts>> &
      CombinedPartsState<Parts>,
    DispatchableAction
  >;
}
