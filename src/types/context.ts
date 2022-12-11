import type { ReactNode } from 'react';
import type { Action, AnyAction } from 'redux';
import type { Store } from './store';

export interface ReactReduxPartitionerContextType<
  DispatchableAction extends Action = AnyAction,
  State = unknown
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
  DispatchableAction extends Action = AnyAction,
  State = unknown
> extends ReactReduxPartitionerContextType<DispatchableAction, State> {
  children: ReactNode;
}
