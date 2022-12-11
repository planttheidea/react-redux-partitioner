import { part } from '../src';
import { createStore } from './__utils__/createStore';

describe('enhancer', () => {
  describe('store properties', () => {
    it('should enhance the store with the properties needed', () => {
      const primitivePart = part('primitive', 'value');
      const otherPart = part('other', 123);
      const store = createStore([primitivePart, otherPart] as const);

      expect(typeof store.dispatch).toBe('function');
      expect(typeof store.getState).toBe('function');
      expect(typeof store.subscribe).toBe('function');
      expect(typeof store.subscribeToPart).toBe('function');
    });
  });

  describe('getting state', () => {
    it('should return the complete state object when no parameter is passed', () => {
      const primitivePart = part('primitive', 'value');
      const otherPart = part('other', 123);
      const store = createStore([primitivePart, otherPart] as const);

      expect(store.getState()).toEqual({
        other: 123,
        primitive: 'value',
      });

      store.dispatch(primitivePart('next value'));
      store.dispatch(otherPart(234));

      expect(store.getState()).toEqual({
        other: 234,
        primitive: 'next value',
      });
    });

    it('should return the state for the specific part when passed as a parameter', () => {
      const primitivePart = part('primitive', 'value');
      const otherPart = part('other', 123);
      const store = createStore([primitivePart, otherPart] as const);

      expect(store.getState(primitivePart)).toEqual('value');
      expect(store.getState(otherPart)).toEqual(123);

      store.dispatch(primitivePart('next value'));
      store.dispatch(otherPart(234));

      expect(store.getState(primitivePart)).toEqual('next value');
      expect(store.getState(otherPart)).toEqual(234);
    });
  });

  describe('subscriptions', () => {
    it('should allow subscription to changes in all state', () => {
      const primitivePart = part('primitive', 'value');
      const otherPart = part('other', 123);
      const store = createStore([primitivePart, otherPart] as const);

      const listener = jest.fn();
      const unsubscribe = store.subscribe(listener);

      store.dispatch(primitivePart('next value'));
      store.dispatch(otherPart(234));

      expect(listener).toHaveBeenCalledTimes(2);

      listener.mockClear();

      // Setting to the same value does not update state, and therefore
      // should not notify listeners.
      store.dispatch(primitivePart('next value'));

      expect(listener).not.toHaveBeenCalled();

      unsubscribe();

      store.dispatch(primitivePart('third value'));

      expect(listener).not.toHaveBeenCalled();
    });

    it('should allow subscription to state changes for a specific part', () => {
      const primitivePart = part('primitive', 'value');
      const otherPart = part('other', 123);
      const store = createStore([primitivePart, otherPart] as const);

      const listener = jest.fn();
      const unsubscribe = store.subscribeToPart(primitivePart, listener);

      store.dispatch(primitivePart('next value'));
      store.dispatch(otherPart(234));

      expect(listener).toHaveBeenCalledTimes(1);

      listener.mockClear();

      // Setting to the same value does not update state, and therefore
      // should not notify listeners.
      store.dispatch(primitivePart('next value'));

      expect(listener).not.toHaveBeenCalled();

      unsubscribe();

      store.dispatch(primitivePart('third value'));

      expect(listener).not.toHaveBeenCalled();
    });

    it('should ignore changes to other parts', () => {
      const primitivePart = part('primitive', 'value');
      const otherPart = part('other', 123);
      const store = createStore([primitivePart, otherPart] as const);

      const listener = jest.fn();

      store.subscribeToPart(primitivePart, listener);

      store.dispatch(otherPart(234));

      expect(listener).not.toHaveBeenCalled();

      store.dispatch({ type: 'UNRELATED_TYPE' });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should notify when an composed owner state value is updated', () => {
      const primitivePart = part('primitive', 'value');
      const otherPart = part('other', 123);
      const ownerPart = part('owner', [primitivePart]);
      const store = createStore([ownerPart, otherPart] as const);

      const listener = jest.fn();
      const unsubscribe = store.subscribeToPart(primitivePart, listener);

      store.dispatch(primitivePart('next value'));
      store.dispatch(otherPart(234));

      expect(listener).toHaveBeenCalledTimes(1);

      listener.mockClear();

      // Setting to the same value does not update state, and therefore
      // should not notify listeners.
      store.dispatch(primitivePart('next value'));

      expect(listener).not.toHaveBeenCalled();

      store.dispatch(ownerPart({ primitive: 'third value' }));

      expect(listener).toHaveBeenCalledTimes(1);

      listener.mockClear();

      unsubscribe();

      store.dispatch(primitivePart('fourth value'));

      expect(listener).not.toHaveBeenCalled();
    });

    it('should notify listeners for owners when composed parts are updated', () => {
      const primitivePart = part('primitive', 'value');
      const otherPart = part('other', 123);
      const ownerPart = part('owner', [primitivePart]);
      const store = createStore([ownerPart, otherPart] as const);

      const listener = jest.fn();
      const unsubscribe = store.subscribeToPart(ownerPart, listener);

      store.dispatch(primitivePart('next value'));

      expect(listener).toHaveBeenCalledTimes(1);

      listener.mockClear();

      store.dispatch(otherPart(234));

      expect(listener).not.toHaveBeenCalled();

      // Setting to the same value does not update state, and therefore
      // should not notify listeners.
      store.dispatch(primitivePart('next value'));

      expect(listener).not.toHaveBeenCalled();

      unsubscribe();

      store.dispatch(primitivePart('third value'));

      expect(listener).not.toHaveBeenCalled();
    });

    it('should notify select-based dependents when stateful parts are updated', () => {
      const primitivePart = part('primitive', 'value');
      const otherPart = part('other', 123);
      const ownerPart = part('owner', [primitivePart]);
      const store = createStore([ownerPart, otherPart] as const);

      const selectBoth = part(
        [primitivePart, otherPart],
        (primitive, other) => `${primitive}:${other}`
      );
      const primitiveOnly = part([primitivePart], (primitive) =>
        primitive.slice(1)
      );
      const otherOnly = part([otherPart], (other) => other * other);
      const ownerOnly = part([ownerPart], (owner) => owner);

      const bothListener = jest.fn();
      store.subscribeToPart(selectBoth, bothListener);

      const primitiveListener = jest.fn();
      store.subscribeToPart(primitiveOnly, primitiveListener);

      const otherListener = jest.fn();
      store.subscribeToPart(otherOnly, otherListener);

      const ownerListener = jest.fn();
      store.subscribeToPart(ownerOnly, ownerListener);

      const clearAll = () =>
        [bothListener, primitiveListener, otherListener, ownerListener].forEach(
          (listener) => listener.mockClear()
        );

      store.dispatch(primitivePart('next value'));

      expect(bothListener).toHaveBeenCalledTimes(1);
      expect(primitiveListener).toHaveBeenCalledTimes(1);
      expect(otherListener).not.toHaveBeenCalled();
      expect(ownerListener).toHaveBeenCalledTimes(1);

      clearAll();

      store.dispatch(otherPart(234));

      expect(bothListener).toHaveBeenCalledTimes(1);
      expect(primitiveListener).not.toHaveBeenCalled();
      expect(otherListener).toHaveBeenCalledTimes(1);
      expect(ownerListener).not.toHaveBeenCalled();

      clearAll();

      store.dispatch(ownerPart({ primitive: 'third value' }));

      expect(bothListener).toHaveBeenCalledTimes(1);
      expect(primitiveListener).toHaveBeenCalledTimes(1);
      expect(otherListener).not.toHaveBeenCalled();
      expect(ownerListener).toHaveBeenCalledTimes(1);

      clearAll();
    });

    it('should notify the entire descendancy tree', () => {
      const primitivePart = part('primitive', 'value');
      const otherPart = part('other', 123);
      const store = createStore([primitivePart, otherPart] as const);

      const uppercase = part([primitivePart], (primitive) =>
        primitive.toUpperCase()
      );
      const squared = part([otherPart], (other) => other ** 2);
      const combined = part(
        [uppercase, squared],
        (primitive, other) => `${primitive}:${other}`
      );
      const splitUppercase = part([uppercase], (primitive) =>
        primitive.split('')
      );
      const squaredHalved = part([squared], (other) => other / 2);

      const [
        [uppercaseListener, unsubscribeUppercase],
        [squaredListener, unsubscribeSquared],
        [combinedListener],
        [splitListener],
        [halvedListener],
      ] = [uppercase, squared, combined, splitUppercase, squaredHalved].map(
        (part) => {
          const listener = jest.fn();

          return [listener, store.subscribeToPart(part, listener)];
        }
      );

      const clearAll = () =>
        [
          uppercaseListener,
          squaredListener,
          combinedListener,
          splitListener,
          halvedListener,
        ].forEach((listener) => listener.mockClear());

      store.dispatch(primitivePart('next value'));

      expect(uppercaseListener).toHaveBeenCalledTimes(1);
      expect(squaredListener).not.toHaveBeenCalled();
      expect(combinedListener).toHaveBeenCalledTimes(1);
      expect(splitListener).toHaveBeenCalledTimes(1);
      expect(halvedListener).not.toHaveBeenCalled();

      clearAll();

      store.dispatch(otherPart(234));

      expect(uppercaseListener).not.toHaveBeenCalled();
      expect(squaredListener).toHaveBeenCalledTimes(1);
      expect(combinedListener).toHaveBeenCalledTimes(1);
      expect(splitListener).not.toHaveBeenCalled();
      expect(halvedListener).toHaveBeenCalledTimes(1);

      clearAll();

      unsubscribeUppercase();
      unsubscribeSquared();

      store.dispatch(primitivePart('third value'));

      expect(uppercaseListener).not.toHaveBeenCalled();
      expect(squaredListener).not.toHaveBeenCalled();
      expect(combinedListener).toHaveBeenCalledTimes(1);
      expect(splitListener).toHaveBeenCalledTimes(1);
      expect(halvedListener).not.toHaveBeenCalled();

      clearAll();

      store.dispatch(otherPart(345));

      expect(uppercaseListener).not.toHaveBeenCalled();
      expect(squaredListener).not.toHaveBeenCalled();
      expect(combinedListener).toHaveBeenCalledTimes(1);
      expect(splitListener).not.toHaveBeenCalled();
      expect(halvedListener).toHaveBeenCalledTimes(1);
    });
  });
});
