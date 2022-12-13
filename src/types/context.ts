import type { ReactNode } from 'react';
import type { Action, AnyAction } from 'redux';
import type { Store } from './store';

export interface ReactReduxPartitionerContextType<
  State = unknown,
  DispatchableAction extends Action = AnyAction
> {
  /**
   * Returns a snapshot of state, essentially the server-side equivalent of
   * `store.getState()`. Used for SSR.
   */
  getServerState?: () => State;
  /**
   * The store which has been enhanced with the partitioner.
   */
  store: Store<State, DispatchableAction>;
}

export interface ProviderProps<
  State = unknown,
  DispatchableAction extends Action = AnyAction
> extends ReactReduxPartitionerContextType<State, DispatchableAction> {
  children: ReactNode;
}
