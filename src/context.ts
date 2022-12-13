import { createContext, createElement, useMemo } from 'react';

import type { Action, AnyAction } from 'redux';
import type { ProviderProps, ReactReduxPartitionerContextType } from './types';

/**
 * Context used by partitioner hooks internally.
 */
export const ReactReduxPartitionerContext =
  createContext<ReactReduxPartitionerContextType>(null);

const { Provider: ContextProvider } = ReactReduxPartitionerContext;

/**
 * Provides the store values used by the partitioner to manage updates
 * of Parts within the subtree.
 */
export function Provider<
  State = unknown,
  DispatchableAction extends Action = AnyAction
>({
  children,
  getServerState,
  store,
}: ProviderProps<State, DispatchableAction>): JSX.Element {
  const context = useMemo(
    () => ({ getServerState, store }),
    [getServerState, store]
  );

  return /*#__PURE__*/ createElement(
    ContextProvider,
    { value: context },
    children
  );
}
