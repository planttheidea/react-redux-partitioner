import { act, render, renderHook, waitFor } from '@testing-library/react';
import { Suspense, useEffect, useRef, type ReactNode } from 'react';
import {
  type CombinedPartsState,
  type Store,
  Provider,
  part,
  usePart,
  usePartUpdate,
  usePartValue,
} from '../src';
import { noop } from '../src/utils';
import { createStore } from './__utils__/createStore';

function createSuspenseWrapper(store: Store) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Provider store={store}>
        <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
      </Provider>
    );
  };
}

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

  const uppercasePart = part([primitivePart], (primitive) =>
    primitive.toUpperCase()
  );
  const uppercaseAsyncPart = part([primitivePart], async (primitive) => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    return primitive.toUpperCase();
  });

  let store: Store<CombinedPartsState<typeof parts>>;

  beforeEach(() => {
    store = createStore({ parts });
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

    describe('select parts', () => {
      it('should update whenever the primitive part updates', () => {
        const { result } = renderHook(() => usePart(uppercasePart), {
          wrapper: createWrapper(store),
        });

        const [uppercase, noOp] = result.current;

        expect(uppercase).toBe('VALUE');
        expect(noOp).toBe(noop);

        act(() => {
          store.dispatch(primitivePart('next value'));
        });

        const [nextUppercase] = result.current;

        expect(nextUppercase).toBe('NEXT VALUE');
      });

      it('should update whenever the composed part updates the primitive it refers to', () => {
        const uppercaseFromComposedPart = part(
          [composedPart],
          ({ primitive }) => primitive.toUpperCase()
        );

        const { result } = renderHook(
          () => usePart(uppercaseFromComposedPart),
          {
            wrapper: createWrapper(store),
          }
        );

        const [uppercase, noOp] = result.current;

        expect(uppercase).toBe('VALUE');
        expect(noOp).toBe(noop);

        act(() => {
          store.dispatch(composedPart({ other: 123, primitive: 'next value' }));
        });

        const [nextUppercase] = result.current;

        expect(nextUppercase).toBe('NEXT VALUE');
      });

      it('should update whenever the parent selector part updates', () => {
        const splitUppercasePart = part({
          get: (uppercase) => uppercase.split(''),
          isEqual: (prev, next) => prev.join('') === next.join(''),
          parts: [uppercasePart],
        });

        const { result } = renderHook(() => usePart(splitUppercasePart), {
          wrapper: createWrapper(store),
        });

        const [splitUppercase, noOp] = result.current;

        expect(splitUppercase).toEqual(['V', 'A', 'L', 'U', 'E']);
        expect(noOp).toBe(noop);

        act(() => {
          store.dispatch(primitivePart('next value'));
        });

        const [nextSplitUppercase] = result.current;

        expect(nextSplitUppercase).toEqual([
          'N',
          'E',
          'X',
          'T',
          ' ',
          'V',
          'A',
          'L',
          'U',
          'E',
        ]);
      });

      it('should handle async selectors', async () => {
        const { result } = renderHook(() => usePart(uppercaseAsyncPart), {
          wrapper: createSuspenseWrapper(store),
        });

        await waitFor(() => expect(result.current).not.toBeNull());

        const [uppercase, noOp] = result.current;

        expect(uppercase).toBe('VALUE');
        expect(noOp).toBe(noop);

        act(() => {
          store.dispatch(primitivePart('next value'));
        });

        await waitFor(() => expect(result.current[0]).not.toBe(uppercase));

        const [nextUppercase] = result.current;

        expect(nextUppercase).toBe('NEXT VALUE');
      });

      it('should handle downstream async selectors', async () => {
        const splitUppercaseAsyncPart = part({
          get: (uppercase) => uppercase.split(''),
          isEqual: (prev, next) => prev.join('') === next.join(''),
          parts: [uppercaseAsyncPart],
        });

        const { result } = renderHook(() => usePart(splitUppercaseAsyncPart), {
          wrapper: createSuspenseWrapper(store),
        });

        await waitFor(() => expect(result.current).not.toBeNull());

        const [splitUppercase, noOp] = result.current;

        expect(splitUppercase).toEqual(['V', 'A', 'L', 'U', 'E']);
        expect(noOp).toBe(noop);

        act(() => {
          store.dispatch(primitivePart('next value'));
        });

        await waitFor(() =>
          expect(result.current[0]).not.toEqual(splitUppercase)
        );

        const [nextSplitUppercase] = result.current;

        expect(nextSplitUppercase).toEqual([
          'N',
          'E',
          'X',
          'T',
          ' ',
          'V',
          'A',
          'L',
          'U',
          'E',
        ]);
      });
    });

    describe('update parts', () => {
      const primitiveNonEmptyUpdate = part(
        null,
        (dispatch, _getState, nextValue: string) => {
          if (nextValue) {
            dispatch(primitivePart(nextValue));
          }
        }
      );

      it('should perform the update operation', () => {
        const { result } = renderHook(() => usePart(primitiveNonEmptyUpdate), {
          wrapper: createWrapper(store),
        });

        const [undef, updateNonEmpty] = result.current;

        expect(undef).toBeUndefined();
        expect(updateNonEmpty).toEqual(expect.any(Function));

        act(() => {
          updateNonEmpty('next value');
        });

        const [, nextUpdateNonEmpty] = result.current;

        expect(nextUpdateNonEmpty).toBe(updateNonEmpty);

        expect(store.getState(primitivePart)).toBe('next value');
      });
    });
  });

  describe('usePartUpdate', () => {
    const primitiveNonEmptyUpdate = part(
      null,
      (dispatch, _getState, nextValue: string) => {
        if (nextValue) {
          dispatch(primitivePart(nextValue));
        }
      }
    );

    it('should perform the update operation when a stateful part', () => {
      const { result } = renderHook(() => usePartUpdate(primitivePart), {
        wrapper: createWrapper(store),
      });

      const updatePrimitive = result.current;

      expect(updatePrimitive).toEqual(expect.any(Function));

      act(() => {
        updatePrimitive('next value');
      });

      const nextUpdatePrimitive = result.current;

      expect(nextUpdatePrimitive).toBe(updatePrimitive);

      expect(store.getState(primitivePart)).toBe('next value');
    });

    it('should perform the update operation when an update part', () => {
      const { result } = renderHook(
        () => usePartUpdate(primitiveNonEmptyUpdate),
        {
          wrapper: createWrapper(store),
        }
      );

      const updateNonEmpty = result.current;

      expect(updateNonEmpty).toEqual(expect.any(Function));

      act(() => {
        updateNonEmpty('next value');
      });

      const nextUpdateNonEmpty = result.current;

      expect(nextUpdateNonEmpty).toBe(updateNonEmpty);

      expect(store.getState(primitivePart)).toBe('next value');
    });

    it('should be a no-op when part is not updateable', () => {
      const { result } = renderHook(() => usePartUpdate(uppercasePart), {
        wrapper: createWrapper(store),
      });

      const noOp = result.current;

      expect(noOp).toBe(noop);
    });
  });

  describe('usePartValue', () => {
    it('should update whenever the part updates itself', () => {
      const { result } = renderHook(() => usePartValue(primitivePart), {
        wrapper: createWrapper(store),
      });

      const primitive = result.current;

      expect(primitive).toBe('value');

      act(() => {
        store.dispatch(primitivePart('next value'));
      });

      const nextPrimitive = result.current;

      expect(nextPrimitive).toBe('next value');
    });

    it('should update whenever the part updates via owner', () => {
      const { result } = renderHook(() => usePartValue(primitivePart), {
        wrapper: createWrapper(store),
      });

      const primitive = result.current;

      expect(primitive).toBe('value');

      act(() => {
        store.dispatch(composedPart({ other: 123, primitive: 'next value' }));
      });

      const nextPrimitive = result.current;

      expect(nextPrimitive).toBe('next value');
    });

    it('should update whenever the select part updates', () => {
      const { result } = renderHook(() => usePartValue(uppercasePart), {
        wrapper: createWrapper(store),
      });

      const uppercase = result.current;

      expect(uppercase).toBe('VALUE');

      act(() => {
        store.dispatch(primitivePart('next value'));
      });

      const nextUppercase = result.current;

      expect(nextUppercase).toBe('NEXT VALUE');
    });

    it('should handle async selectors', async () => {
      const { result } = renderHook(() => usePartValue(uppercaseAsyncPart), {
        wrapper: createSuspenseWrapper(store),
      });

      await waitFor(() => expect(result.current).not.toBeNull());

      const uppercase = result.current;

      expect(uppercase).toBe('VALUE');

      act(() => {
        store.dispatch(primitivePart('next value'));
      });

      await waitFor(() => expect(result.current).not.toBe(uppercase));

      const nextUppercase = result.current;

      expect(nextUppercase).toBe('NEXT VALUE');
    });
  });
});
