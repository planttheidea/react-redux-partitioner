import { configureStore } from '@reduxjs/toolkit';
import React, { Suspense, useEffect, useRef } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import {
  Provider,
  createPartitioner,
  part,
  usePart,
  usePartValue,
} from '../src';

const primitivePart = part('primitive', 'value');
const composedPart = part('composed', [primitivePart]);

const errorPart = part([primitivePart], (primitive) => {
  console.log('called sync', primitive);

  if (primitive === 'value') {
    throw new Error(primitive);
  }

  return 'okay';
});
const errorAsyncPart = part([primitivePart], async (primitive) => {
  console.log('called async', primitive);

  if (primitive === 'value') {
    throw new Error(primitive);
  }

  return 'okay';
});

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

function ErrorAsyncComponent() {
  const value = usePartValue(errorAsyncPart);

  return <div>Async: {value}</div>;
}

function ErrorComponent() {
  const value = usePartValue(errorPart);

  return <div>Sync: {value}</div>;
}

function ErrorFallback({
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  const primitive = usePartValue(primitivePart);
  const prevPrimitiveRef = useRef(primitive);

  useEffect(() => {
    if (primitive !== prevPrimitiveRef.current) {
      console.log('resetting');
      resetErrorBoundary();
    }
  }, [primitive]);

  useEffect(() => {
    prevPrimitiveRef.current = primitive;
  });

  return <div>Error in component.</div>;
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

        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Suspense fallback={<span>Loading...</span>}>
            <ErrorAsyncComponent />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <ErrorComponent />
        </ErrorBoundary>
      </main>
    </Provider>
  );
}
