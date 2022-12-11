import { type Dispatch } from 'redux';
import { part, type GetState } from '../src';
import { createStore } from './__utils__/createStore';

describe('part', () => {
  describe('Primitive', () => {
    it('should be an action creator for the part', () => {
      const primitivePart = part('primitive', 'value');

      expect(primitivePart('next value')).toEqual({
        $$part: primitivePart.id,
        type: 'UPDATE_PRIMITIVE',
        value: 'next value',
      });
    });

    it('should get the correct value from state', () => {
      const primitivePart = part('primitive', 'value');
      const store = createStore([primitivePart] as const);

      expect(store.getState(primitivePart)).toBe('value');
    });

    it('should derive the correct next state based on the action', () => {
      const primitivePart = part('primitive', 'value');
      const store = createStore([primitivePart] as const);

      store.dispatch(primitivePart('next value'));

      expect(store.getState(primitivePart)).toBe('next value');
    });
  });

  describe('Composed', () => {
    it('should be an action creator for the part', () => {
      const primitivePart = part('primitive', 'value');
      const composedPart = part('composed', [primitivePart]);

      expect(composedPart({ primitive: 'next value' })).toEqual({
        $$part: composedPart.id,
        type: 'UPDATE_COMPOSED',
        value: { primitive: 'next value' },
      });
    });

    it('should get the correct value from state', () => {
      const primitivePart = part('primitive', 'value');
      const composedPart = part('composed', [primitivePart]);
      const store = createStore([composedPart] as const);

      expect(store.getState(composedPart)).toEqual({ primitive: 'value' });
    });

    it('should get the correct value from state of a chile primitive', () => {
      const primitivePart = part('primitive', 'value');
      const composedPart = part('composed', [primitivePart]);
      const store = createStore([composedPart] as const);

      expect(store.getState(primitivePart)).toEqual('value');
    });

    it('should derive the correct next state based on the action', () => {
      const primitivePart = part('primitive', 'value');
      const composedPart = part('composed', [primitivePart]);
      const store = createStore([composedPart] as const);

      store.dispatch(composedPart({ primitive: 'next value' }));

      expect(store.getState(composedPart)).toEqual({ primitive: 'next value' });
    });

    it('should derive the correct next state based on the action of a child primitive', () => {
      const primitivePart = part('primitive', 'value');
      const composedPart = part('composed', [primitivePart]);
      const store = createStore([composedPart] as const);

      store.dispatch(primitivePart('next value'));

      expect(store.getState(composedPart)).toEqual({ primitive: 'next value' });
    });

    it('should handle multiple levels of composition', () => {
      const aPart = part('a', 'value');
      const bPart = part('b', [aPart]);
      const cPart = part('c', [bPart]);
      const dPart = part('d', [cPart]);
      const ePart = part('e', [dPart]);
      const fPart = part('f', [ePart]);
      const store = createStore([fPart] as const);

      store.dispatch(aPart('next value'));

      expect(store.getState()).toEqual({
        f: { e: { d: { c: { b: { a: 'next value' } } } } },
      });
      expect(store.getState(fPart)).toEqual({
        e: { d: { c: { b: { a: 'next value' } } } },
      });
      expect(store.getState(ePart)).toEqual({
        d: { c: { b: { a: 'next value' } } },
      });
      expect(store.getState(dPart)).toEqual({ c: { b: { a: 'next value' } } });
      expect(store.getState(cPart)).toEqual({ b: { a: 'next value' } });
      expect(store.getState(bPart)).toEqual({ a: 'next value' });
      expect(store.getState(aPart)).toEqual('next value');
    });
  });

  describe('Select', () => {
    it('should be a selector for the part', () => {
      const primitivePart = part('primitive', 'value');
      const store = createStore([primitivePart] as const);

      const selectUppercasePrimitive = part([primitivePart], (primitive) =>
        primitive.toUpperCase()
      );

      expect(selectUppercasePrimitive(store.getState)).toEqual('VALUE');
    });

    it('should be a general selector, if no parts are provided', () => {
      const primitivePart = part('primitive', 'value');
      const store = createStore([primitivePart] as const);

      const selectUppercasePrimitive = part((getState) =>
        getState(primitivePart).toUpperCase()
      );

      expect(selectUppercasePrimitive(store.getState)).toEqual('VALUE');
    });

    it('should support nesting of selectors', () => {
      const primitivePart = part('primitive', 'value');
      const store = createStore([primitivePart] as const);

      const selectUppercasePrimitive = part([primitivePart], (primitive) =>
        primitive.toUpperCase()
      );
      const selectReverseUppercasePrimitive = part(
        [selectUppercasePrimitive],
        (primitive) => primitive.split('').reverse().join('')
      );
      const selectReversePrimitive = part(
        [selectReverseUppercasePrimitive],
        (primitive) => primitive.toLowerCase()
      );
      const selectOriginalPrimitive = part(
        [selectReversePrimitive],
        (primitive) => primitive.split('').reverse().join('')
      );

      expect(selectUppercasePrimitive(store.getState)).toEqual('VALUE');
      expect(selectReverseUppercasePrimitive(store.getState)).toEqual('EULAV');
      expect(selectReversePrimitive(store.getState)).toEqual('eulav');
      expect(selectOriginalPrimitive(store.getState)).toEqual('value');
    });

    it('should support async selectors for the part', async () => {
      const primitivePart = part('primitive', 'value');
      const store = createStore([primitivePart] as const);

      const selectUppercasePrimitive = part(
        [primitivePart],
        async (primitive) => primitive.toUpperCase()
      );

      expect(await selectUppercasePrimitive(store.getState)).toEqual('VALUE');
    });

    it('should be a general async selector, if no parts are provided', async () => {
      const primitivePart = part('primitive', 'value');
      const store = createStore([primitivePart] as const);

      const selectUppercasePrimitive = part(async (getState) =>
        getState(primitivePart).toUpperCase()
      );

      expect(await selectUppercasePrimitive(store.getState)).toEqual('VALUE');
    });

    it('should support nesting of selectors, both async and sync', async () => {
      const primitivePart = part('primitive', 'value');
      const store = createStore([primitivePart] as const);

      const selectUppercasePrimitive = part(
        [primitivePart],
        async (primitive) => primitive.toUpperCase()
      );
      const selectReverseUppercasePrimitive = part(
        [selectUppercasePrimitive],
        (primitive) => primitive.split('').reverse().join('')
      );
      const selectReversePrimitive = part(
        [selectReverseUppercasePrimitive],
        async (primitive) => primitive.toLowerCase()
      );
      const selectOriginalPrimitive = part(
        [selectReversePrimitive],
        (primitive) => primitive.split('').reverse().join('')
      );

      expect(await selectUppercasePrimitive(store.getState)).toEqual('VALUE');
      expect(await selectReverseUppercasePrimitive(store.getState)).toEqual(
        'EULAV'
      );
      expect(await selectReversePrimitive(store.getState)).toEqual('eulav');
      expect(await selectOriginalPrimitive(store.getState)).toEqual('value');
    });
  });

  describe('Update', () => {
    it('should be a thunk action creator', () => {
      const primitivePart = part('primitive', 'value');
      const store = createStore([primitivePart] as const);

      const primitiveUpdate = part(null, (dispatch, _getState, nextValue) =>
        dispatch(primitivePart(nextValue))
      );

      const thunk = primitiveUpdate('next value');

      expect(typeof thunk).toBe('function');

      thunk(store.dispatch, store.getState);

      expect(store.dispatch).toHaveBeenCalledWith(primitivePart('next value'));
    });

    it('should allow for dispatching multiple actions', () => {
      const primitivePart = part('primitive', 'value');
      const otherPart = part('other', 123);
      const store = createStore([primitivePart, otherPart] as const);

      const primitiveUpdate = part(null, (dispatch, _getState, nextValue) => {
        dispatch(primitivePart(nextValue));
        dispatch(otherPart(0));
      });

      const thunk = primitiveUpdate('next value');

      expect(typeof thunk).toBe('function');

      thunk(store.dispatch, store.getState);

      expect(store.dispatch).toHaveBeenNthCalledWith(
        1,
        primitivePart('next value')
      );
      expect(store.dispatch).toHaveBeenNthCalledWith(2, otherPart(0));
    });
  });

  describe('Proxy', () => {
    it('should have a selector for the part', () => {
      const primitivePart = part('primitive', 'value');
      const store = createStore([primitivePart] as const);

      const uppercasePrimitiveProxy = part(
        [primitivePart],
        (primitive) => primitive.toUpperCase(),
        (dispatch, _getState, nextValue) => dispatch(primitivePart(nextValue))
      );

      expect(uppercasePrimitiveProxy.select(store.getState)).toEqual('VALUE');
    });

    it('should have a general selector, if no parts are provided', () => {
      const primitivePart = part('primitive', 'value');
      const store = createStore([primitivePart] as const);

      const uppercasePrimitiveProxy = part(
        (getState) => getState(primitivePart).toUpperCase(),
        (dispatch, _getState, nextValue) => dispatch(primitivePart(nextValue))
      );

      expect(uppercasePrimitiveProxy.select(store.getState)).toEqual('VALUE');
    });

    it('should support nesting of selectors', () => {
      const primitivePart = part('primitive', 'value');
      const store = createStore([primitivePart] as const);

      const setPrimitive = (
        dispatch: Dispatch,
        _getState: GetState,
        nextValue: string
      ) => dispatch(primitivePart(nextValue));

      const uppercasePrimitiveProxy = part(
        [primitivePart],
        (primitive) => primitive.toUpperCase(),
        setPrimitive
      );
      const reverseUppercasePrimitiveProxy = part(
        [uppercasePrimitiveProxy],
        (primitive) => primitive.split('').reverse().join(''),
        setPrimitive
      );
      const reversePrimitiveProxy = part(
        [reverseUppercasePrimitiveProxy],
        (primitive) => primitive.toLowerCase(),
        setPrimitive
      );
      const originalPrimitiveProxy = part(
        [reversePrimitiveProxy],
        (primitive) => primitive.split('').reverse().join(''),
        setPrimitive
      );

      expect(uppercasePrimitiveProxy.select(store.getState)).toEqual('VALUE');
      expect(reverseUppercasePrimitiveProxy.select(store.getState)).toEqual(
        'EULAV'
      );
      expect(reversePrimitiveProxy.select(store.getState)).toEqual('eulav');
      expect(originalPrimitiveProxy.select(store.getState)).toEqual('value');
    });

    it('should support async selectors for the part', async () => {
      const primitivePart = part('primitive', 'value');
      const store = createStore([primitivePart] as const);

      const uppercasePrimitiveProxy = part(
        [primitivePart],
        async (primitive) => primitive.toUpperCase(),
        (dispatch, _getState, nextValue) => dispatch(primitivePart(nextValue))
      );

      expect(await uppercasePrimitiveProxy.select(store.getState)).toEqual(
        'VALUE'
      );
    });

    it('should be a general async selector, if no parts are provided', async () => {
      const primitivePart = part('primitive', 'value');
      const store = createStore([primitivePart] as const);

      const uppercasePrimitiveProxy = part(
        async (getState) => getState(primitivePart).toUpperCase(),
        (dispatch, _getState, nextValue) => dispatch(primitivePart(nextValue))
      );

      expect(await uppercasePrimitiveProxy.select(store.getState)).toEqual(
        'VALUE'
      );
    });

    it('should support nesting of selectors, both async and sync', async () => {
      const primitivePart = part('primitive', 'value');
      const store = createStore([primitivePart] as const);

      const setPrimitive = (
        dispatch: Dispatch,
        _getState: GetState,
        nextValue: string
      ) => dispatch(primitivePart(nextValue));

      const uppercasePrimitiveProxy = part(
        [primitivePart],
        async (primitive) => primitive.toUpperCase(),
        setPrimitive
      );
      const reverseUppercasePrimitiveProxy = part(
        [uppercasePrimitiveProxy],
        (primitive) => primitive.split('').reverse().join(''),
        setPrimitive
      );
      const reversePrimitiveProxy = part(
        [reverseUppercasePrimitiveProxy],
        async (primitive) => primitive.toLowerCase(),
        setPrimitive
      );
      const originalPrimitiveProxy = part(
        [reversePrimitiveProxy],
        (primitive) => primitive.split('').reverse().join(''),
        setPrimitive
      );

      expect(await uppercasePrimitiveProxy.select(store.getState)).toEqual(
        'VALUE'
      );
      expect(
        await reverseUppercasePrimitiveProxy.select(store.getState)
      ).toEqual('EULAV');
      expect(await reversePrimitiveProxy.select(store.getState)).toEqual(
        'eulav'
      );
      expect(await originalPrimitiveProxy.select(store.getState)).toEqual(
        'value'
      );
    });

    it('should have an updater', () => {
      const primitivePart = part('primitive', 'value');
      const store = createStore([primitivePart] as const);

      const primitiveProxy = part(
        [primitivePart],
        (primitive) => primitive,
        (dispatch, _getState, nextValue) => dispatch(primitivePart(nextValue))
      );

      const thunk = primitiveProxy.update('next value');

      expect(typeof thunk).toBe('function');

      thunk(store.dispatch, store.getState);

      expect(store.dispatch).toHaveBeenCalledWith(primitivePart('next value'));
    });

    it('should have an updater that allows for dispatching multiple actions', () => {
      const primitivePart = part('primitive', 'value');
      const otherPart = part('other', 123);
      const store = createStore([primitivePart, otherPart] as const);

      const primitiveProxy = part(
        [primitivePart],
        (primitive) => primitive,
        (dispatch, _getState, nextValue) => {
          dispatch(primitivePart(nextValue));
          dispatch(otherPart(0));
        }
      );

      const thunk = primitiveProxy.update('next value');

      expect(typeof thunk).toBe('function');

      thunk(store.dispatch, store.getState);

      expect(store.dispatch).toHaveBeenNthCalledWith(
        1,
        primitivePart('next value')
      );
      expect(store.dispatch).toHaveBeenNthCalledWith(2, otherPart(0));
    });
  });
});
