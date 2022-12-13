import { createEnhancer } from './enhancer';
import { getStatefulPartMap } from './utils';

import type { AnyAction } from 'redux';
import type { AnyStatefulPart, Partitioner, PartitionerOptions } from './types';
import { createReducer } from './reducer';

/**
 * Create the partitioner, which will manage all Parts that consume or
 * produce a value in Redux State. This includes both the reducer that
 * governs state, as well as the store enhancer to manage the Parts stored.
 */
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
  const enhancer = createEnhancer<Parts, DispatchableAction>({
    notifier,
    partMap,
  });
  const reducer = createReducer<Parts, OtherReducerState, DispatchableAction>({
    otherReducer,
    partMap,
    parts,
  });

  return { enhancer, reducer };
}
