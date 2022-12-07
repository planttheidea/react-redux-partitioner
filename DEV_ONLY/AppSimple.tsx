import { configureStore } from '@reduxjs/toolkit';
import React, { useEffect } from 'react';
import { Provider } from 'react-redux';

import { createPartitioner, createReducer, part, usePart } from '../src';

const primitivePart = part('primitive', 'value');
const composedPart = part('composed', [primitivePart]);

const parts = [composedPart] as const;
const reducer = createReducer(parts);
const enhancer = createPartitioner(parts);

const store = configureStore({ reducer, enhancers: [enhancer] });

console.log(store.getState());
console.log(composedPart.d);

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
  const [value, setValue] = usePart(composedPart);

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
