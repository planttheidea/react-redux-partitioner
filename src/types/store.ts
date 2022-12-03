import type { Action, AnyAction, Store as ReduxStore } from 'redux';
import type {
  AnyPartitionsState,
  AnySelectPartition,
  AnyStatefulPartition,
  PartitionId,
  PartitionResult,
} from './partition';
import type { Listener, Unsubscribe } from './subscription';

export interface GetState<
  State = any,
  Partition extends AnySelectPartition | AnyStatefulPartition =
    | AnySelectPartition
    | AnyStatefulPartition
> {
  (): State;
  (partition: Partition): PartitionResult<Partition>;
}

export interface PartitionAction<Value = any> extends Action {
  $$part: PartitionId;
  value: Value;
}

export type SubscribeToPartition = (
  partition: AnyStatefulPartition,
  listener: Listener
) => Unsubscribe;

export type Store<
  State = any,
  DispatchableAction extends Action = AnyAction
> = ReduxStore<State, DispatchableAction> & PartitionsStoreExtensions;

export interface PartitionsStoreExtensions<
  State extends AnyPartitionsState = any
> {
  getState: GetState<State>;
  subscribeToPartition: SubscribeToPartition;
}
