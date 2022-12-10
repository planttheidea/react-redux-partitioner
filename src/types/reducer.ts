import type { AnyAction, Reducer, ReducersMapObject } from 'redux';
import type { AnyStatefulPart } from './part';
import type { PartMap } from './partitioner';

export interface CreateReducerConfig<
  Parts extends readonly AnyStatefulPart[],
  OtherReducerState,
  DispatchableAction extends AnyAction
> {
  otherReducer?:
    | Reducer<OtherReducerState, DispatchableAction>
    | ReducersMapObject<OtherReducerState, DispatchableAction>
    | undefined;
  partMap: PartMap;
  parts: Parts;
}
