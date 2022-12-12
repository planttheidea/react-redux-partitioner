import { act, render, renderHook } from '@testing-library/react';
import React, { useEffect, useRef, type ReactNode } from 'react';
import {
  type CombinedPartsState,
  type Store,
  Provider,
  part,
  usePart,
  usePartUpdate,
  usePartValue,
} from '../src';
import { createStore } from './__utils__/createStore';

function createWrapper(store: Store) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };
}

describe('hooks', () => {
  const primitivePart = part('primitive', 'value');
  const otherPart = part('other', 123);
  const composedPart = part('composed', [primitivePart, otherPart]);
  const parts = [composedPart] as const;

  let store: Store<CombinedPartsState<typeof parts>>;

  beforeEach(() => {
    store = createStore(parts);
  });

  describe('usePart', () => {
    describe('stateful parts', () => {
      it('should update whenever the primitive part updates via the setter', () => {
        const { result } = renderHook(() => usePart(primitivePart), {
          wrapper: createWrapper(store),
        });

        const [primitive, setPrimitive] = result.current;

        expect(primitive).toBe('value');
        expect(setPrimitive).toEqual(expect.any(Function));

        act(() => {
          setPrimitive('next value');
        });

        const [nextPrimitive, nextSetPrimitive] = result.current;

        expect(nextPrimitive).toBe('next value');
        expect(nextSetPrimitive).toBe(setPrimitive);
      });

      it('should update whenever the primitive part updates external from the setter', () => {
        const { result } = renderHook(() => usePart(primitivePart), {
          wrapper: createWrapper(store),
        });

        const [primitive] = result.current;

        expect(primitive).toBe('value');

        act(() => {
          store.dispatch(primitivePart('next value'));
        });

        const [nextPrimitive] = result.current;

        expect(nextPrimitive).toBe('next value');
      });

      it('should update whenever the composed part updates via the setter', () => {
        const { result } = renderHook(() => usePart(composedPart), {
          wrapper: createWrapper(store),
        });

        const [composed, setComposed] = result.current;

        expect(composed).toEqual({ other: 123, primitive: 'value' });
        expect(setComposed).toEqual(expect.any(Function));

        act(() => {
          setComposed((prev) => ({ ...prev, primitive: 'next value' }));
        });

        const [nextComposed, nextSetComposed] = result.current;

        expect(nextComposed).toEqual({ other: 123, primitive: 'next value' });
        expect(nextSetComposed).toBe(setComposed);
      });

      it('should update whenever the composed part updates external to the setter', () => {
        const { result } = renderHook(() => usePart(composedPart), {
          wrapper: createWrapper(store),
        });

        const [composed] = result.current;

        expect(composed).toEqual({ other: 123, primitive: 'value' });

        act(() => {
          store.dispatch(composedPart({ other: 123, primitive: 'next value' }));
        });

        const [nextComposed] = result.current;

        expect(nextComposed).toEqual({ other: 123, primitive: 'next value' });
      });

      it('should update the primitive whenever the composed part updates external to the setter', () => {
        const { result } = renderHook(() => usePart(primitivePart), {
          wrapper: createWrapper(store),
        });

        const [primitive] = result.current;

        expect(primitive).toBe('value');

        act(() => {
          store.dispatch(composedPart({ other: 123, primitive: 'next value' }));
        });

        const [nextPrimitive] = result.current;

        expect(nextPrimitive).toBe('next value');
      });

      it('should update the composed part whenever the primitive part updates external to the setter', () => {
        const { result } = renderHook(() => usePart(composedPart), {
          wrapper: createWrapper(store),
        });

        const [composed] = result.current;

        expect(composed).toEqual({ other: 123, primitive: 'value' });

        act(() => {
          store.dispatch(primitivePart('next value'));
        });

        const [nextComposed] = result.current;

        expect(nextComposed).toEqual({ other: 123, primitive: 'next value' });
      });

      function useRenderCount() {
        const count = useRef(1);

        useEffect(() => {
          count.current++;
        });

        return count.current;
      }

      function AppWithRenderCount() {
        const [other] = usePart(otherPart);
        const count = useRenderCount();

        return (
          <div>
            <div>Other: {other}</div>
            <div data-testid="renderCount">{count}</div>
          </div>
        );
      }

      it('should ignore updates when siblings update but are not listened to', () => {
        const { getByTestId } = render(<AppWithRenderCount />, {
          wrapper: createWrapper(store),
        });

        expect(getByTestId('renderCount').textContent).toBe('1');

        act(() => {
          store.dispatch(otherPart(234));
        });

        // Should have updated because values changed
        expect(getByTestId('renderCount').textContent).toBe('2');

        act(() => {
          store.dispatch(primitivePart('next value'));
        });

        expect(getByTestId('renderCount').textContent).toBe('2');
      });

      it('should not notify if state is unchanged', () => {
        const { getByTestId } = render(<AppWithRenderCount />, {
          wrapper: createWrapper(store),
        });

        expect(getByTestId('renderCount').textContent).toBe('1');

        act(() => {
          store.dispatch(otherPart(123));
        });

        expect(getByTestId('renderCount').textContent).toBe('1');
      });
    });
  });
});
