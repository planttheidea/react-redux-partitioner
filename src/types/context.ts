import type { ReactNode } from 'react';
import type { Action, AnyAction } from 'redux';
import type { Store } from './store';

export interface ReactReduxPartitionerContextType<
  DispatchableAction extends Action = AnyAction,
  State = unknown
> {
  getServerState?: () => State;
  store: Store<State, DispatchableAction>;
}

export interface ProviderProps<
  DispatchableAction extends Action = AnyAction,
  State = unknown
> extends ReactReduxPartitionerContextType<DispatchableAction, State> {
  children: ReactNode;
}
