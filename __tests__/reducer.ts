import { type Action } from 'redux';
import { createStore } from './__utils__/createStore';
import { composedPart, primitivePart } from './__utils__/parts';

describe('reducer', () => {
  it('should handle creation with parts', () => {
    const store = createStore({ parts: [composedPart] as const });

    expect(store.getState()).toEqual({
      composed: {
        primitive: 'value',
      },
    });

    store.dispatch(primitivePart('next value'));

    expect(store.getState()).toEqual({
      composed: {
        primitive: 'next value',
      },
    });
  });

  it('should handle creation with parts and traditional reducers to compose', () => {
    const count = (state = 0, action: Action) => {
      switch (action.type) {
        case 'INCREMENT':
          return state + 1;

        case 'DECREMENT':
          return state - 1;

        default:
          return state;
      }
    };

    const store = createStore({
      parts: [composedPart] as const,
      otherReducer: { count },
    });

    expect(store.getState()).toEqual({
      composed: {
        primitive: 'value',
      },
      count: 0,
    });

    store.dispatch(primitivePart('next value'));

    expect(store.getState()).toEqual({
      composed: {
        primitive: 'next value',
      },
      count: 0,
    });

    store.dispatch({ type: 'INCREMENT' });

    expect(store.getState()).toEqual({
      composed: {
        primitive: 'next value',
      },
      count: 1,
    });
  });

  it('should handle creation with parts a single traditional reducer', () => {
    interface State {
      count: number;
    }

    const count = (state: State = { count: 0 }, action: Action) => {
      switch (action.type) {
        case 'INCREMENT':
          return { ...state, count: state.count + 1 };

        case 'DECREMENT':
          return { ...state, count: state.count - 1 };

        default:
          return state;
      }
    };

    const store = createStore({
      parts: [composedPart] as const,
      otherReducer: count,
    });

    expect(store.getState()).toEqual({
      composed: {
        primitive: 'value',
      },
      count: 0,
    });

    store.dispatch(primitivePart('next value'));

    expect(store.getState()).toEqual({
      composed: {
        primitive: 'next value',
      },
      count: 0,
    });

    store.dispatch({ type: 'INCREMENT' });

    expect(store.getState()).toEqual({
      composed: {
        primitive: 'next value',
      },
      count: 1,
    });
  });
});
