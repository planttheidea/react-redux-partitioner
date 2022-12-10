import { createContext, createElement, useMemo } from 'react';

import type { Action, AnyAction } from 'redux';
import type { ProviderProps, ReactReduxPartitionerContextType } from './types';

export const ReactReduxPartitionerContext =
  createContext<ReactReduxPartitionerContextType>(null);

const { Provider: ContextProvider } = ReactReduxPartitionerContext;

export function Provider<
  DispatchableAction extends Action = AnyAction,
  State = unknown
>({
  children,
  getServerState,
  store,
}: ProviderProps<DispatchableAction, State>): JSX.Element {
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
