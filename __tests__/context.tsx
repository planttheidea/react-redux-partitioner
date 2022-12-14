import { render } from '@testing-library/react';
import React, { useContext } from 'react';
import { Provider, ReactReduxPartitionerContext, part } from '../src';
import { createStore } from './__utils__/createStore';

describe('context', () => {
  const primitivePart = part('primitive', 'value');

  it('should provide the value in context', async () => {
    const store = createStore({ parts: [primitivePart] as const });

    let resolveTest: () => void;

    const promise = new Promise<void>((resolve) => {
      resolveTest = resolve;
    });

    function App() {
      const context = useContext(ReactReduxPartitionerContext);

      expect(typeof context).toBe('object');
      expect(context!.store).toEqual(
        expect.objectContaining({
          dispatch: expect.any(Function),
          getState: expect.any(Function),
          subscribe: expect.any(Function),
          subscribeToPart: expect.any(Function),
        })
      );

      resolveTest();

      return <div>Hello!</div>;
    }

    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    await promise;
  });
});
