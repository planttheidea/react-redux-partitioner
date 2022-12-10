import { createEnhancer } from './enhancer';
import { getStatefulPartMap } from './utils';

import type { AnyAction } from 'redux';
import type { AnyStatefulPart, Partitioner, PartitionerOptions } from './types';
import { createReducer } from './reducer';

export function createPartitioner<
  Parts extends readonly AnyStatefulPart[],
  OtherReducerState,
  DispatchableAction extends AnyAction
>({
  notifier = (notify) => notify(),
  otherReducer,
  parts,
}: PartitionerOptions<
  Parts,
  OtherReducerState,
  DispatchableAction
>): Partitioner<Parts, OtherReducerState, DispatchableAction> {
  const partMap = getStatefulPartMap(parts);
  const enhancer = createEnhancer<Parts>({ notifier, partMap });
  const reducer = createReducer<Parts, OtherReducerState, DispatchableAction>({
    otherReducer,
    partMap,
    parts,
  });

  return { enhancer, reducer };
}
