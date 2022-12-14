import { configureStore } from '@reduxjs/toolkit';
import React, { useEffect } from 'react';

import {
  Provider,
  createPartitioner,
  part,
  usePart,
  usePartValue,
} from '../src';

const primitivePart = part('primitive', 'value');
const composedPart = part('composed', [primitivePart]);

const parts = [composedPart] as const;
const { enhancer, reducer } = createPartitioner({ parts });

const store = configureStore({ reducer, enhancers: [enhancer] });

console.log(store.getState());
console.log(composedPart.d);

store.subscribeToDispatch(() => {
  console.log('something was dispatched', store.getState());
});

store.subscribeToPart(primitivePart, () => {
  const primitive = store.getState(primitivePart);

  console.log('primitive updated', primitive);

  if (primitive !== 'third value') {
    store.dispatch(primitivePart('third value'));
  }
});

store.dispatch({ type: 'FOO' });
store.dispatch({ type: 'BAR' });
store.dispatch({ type: 'BAZ' });

function useAfterTimeout(fn: () => void, ms: number) {
  useEffect(() => {
    setTimeout(fn, ms);
  }, []);
}

function Primitive() {
  const [value, setValue] = usePart(primitivePart);

  useAfterTimeout(() => setValue('next value'), 1000);

  return <div>Primitive: {value}</div>;
}

function Composed() {
  const value = usePartValue(composedPart);

  return <div>Composed: {JSON.stringify(value)}</div>;
}

export default function App() {
  return (
    <Provider store={store}>
      <main>
        <h1>App</h1>

        <Primitive />
        <Composed />
      </main>
    </Provider>
  );
}
