import type { Action, AnyAction, Store as ReduxStore } from 'redux';
import type {
  AnyPart,
  AnyPartsState,
  AnySelectablePart,
  PartId,
  PartState,
} from './part';
import type { Listener, Unsubscribe } from './subscription';

export interface GetState<State = any> {
  <CompleteState extends State>(): CompleteState;
  <Part extends AnyPart>(part: Part): PartState<Part>;
}

export interface PartAction<Value = any> extends Action {
  $$part: PartId;
  value: Value;
}

export type SubscribeToPart = (
  part: AnySelectablePart,
  listener: Listener
) => Unsubscribe;

export type Store<
  State = any,
  DispatchableAction extends Action = AnyAction
> = ReduxStore<State, DispatchableAction> & PartsStoreExtensions;

export interface PartsStoreExtensions<State extends AnyPartsState = any> {
  getState: GetState<State>;
  subscribeToPart: SubscribeToPart;
}
