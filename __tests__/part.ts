import { configureStore } from '@reduxjs/toolkit';
import { type Dispatch } from 'redux';
import {
  type AnyStatefulPart,
  type GetState,
  part,
  createPartitioner,
  createReducer,
} from '../src';

function createStore<Parts extends readonly AnyStatefulPart[]>(parts: Parts) {
  return configureStore({
    reducer: createReducer(parts),
    enhancers: [createPartitioner(parts)],
  });
}

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
});
