import React, { createContext, useMemo } from 'react';

import { type Action, type AnyAction } from 'redux';
import { type Store } from '../../src';

export type ReduxPartitionsContextValue = {
  getServerState: (() => any) | undefined;
  store: Store;
};

export const ReduxPartitionsContext =
  createContext<ReduxPartitionsContextValue>({
    store: null,
  } as unknown as ReduxPartitionsContextValue);

interface Props<State, DispatchableAction extends Action = AnyAction> {
  children: any;
  getServerState?: () => any;
  store: Store<State, DispatchableAction>;
}

export function Provider<State, DispatchableAction extends Action>({
  children,
  getServerState,
  store,
}: Props<State, DispatchableAction>) {
  const value = useMemo(
    () => ({ getServerState, store }),
    [getServerState, store]
  );

  return (
    <ReduxPartitionsContext.Provider value={value}>
      {children}
    </ReduxPartitionsContext.Provider>
  );
}
