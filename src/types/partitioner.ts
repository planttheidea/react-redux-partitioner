import type { AnyAction, Reducer, ReducersMapObject } from 'redux';
import { Enhancer } from './enhancer';
import type { AnyStatefulPart, CombinedPartsState, PartId } from './part';
import type { Notifier } from './subscription';

export interface PartitionerOptions<
  Parts extends readonly AnyStatefulPart[],
  OtherReducerState,
  DispatchableAction extends AnyAction
> {
  notifier?: Notifier;
  parts: Parts;
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
  enhancer: Enhancer<Parts>;
  reducer: Reducer<
    Omit<OtherReducerState, keyof CombinedPartsState<Parts>> &
      CombinedPartsState<Parts>,
    DispatchableAction
  >;
}
