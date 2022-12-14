import type {
  Action,
  AnyAction,
  Dispatch as BaseDispatch,
  Store as ReduxStore,
} from 'redux';
import type { PartsStoreExtensions } from './enhancer';
import type { AnyPart, AnySelectablePart, PartId, PartState } from './part';
import type { Listener, Unsubscribe } from './subscription';
import type { Thunk } from './utils';

export interface Dispatch<DispatchableAction extends Action = AnyAction>
  extends BaseDispatch<DispatchableAction> {
  <State, Result>(thunkAction: Thunk<State, Result>): DispatchableAction;
}

export interface GetState<State = any> {
  <CompleteState extends State>(): CompleteState;
  <Part extends AnyPart>(part: Part): PartState<Part>;
}

export type GetVersion = () => number;

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
> = ReduxStore<State, DispatchableAction> &
  PartsStoreExtensions<State, DispatchableAction>;
