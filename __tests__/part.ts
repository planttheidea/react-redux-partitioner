import { type Dispatch } from 'redux';
import {
  type AnyPart,
  type AnyStatefulPart,
  type GetState,
  part,
} from '../src';
import { PRIMITIVE_PART } from '../src/flags';

function createMockGetState(part: AnyStatefulPart, stateValue = part.i) {
  const path = part.p;
  const mockState: Record<string, any> = {};

  let buildState = mockState;

  path.forEach((pathItem, index) => {
    buildState = buildState[pathItem] =
      index === path.length - 1 ? stateValue : {};
  });

  return function getState() {
    return mockState;
  } as GetState;
}

const mockDispatch = function mockDispatch(action: any) {
  return action;
} as Dispatch;

describe('part', () => {
  describe('Primitive', () => {
    it('should create the primitive part with the correct shape', () => {
      const result = part('primitive', 'value');

      expect(result.c).toEqual([]);
      expect(result.d).toEqual([]);
      expect(result.f).toBe(PRIMITIVE_PART);
      expect(result.g).toBeInstanceOf(Function);
      expect(result.i).toBe('value');
      expect(result.n).toBe('primitive');
      expect(result.o).toBe('primitive');
      expect(result.r).toBeInstanceOf(Function);
      expect(result.s).toBeInstanceOf(Function);
    });

    it('should be an action creator for the part', () => {
      const result = part('primitive', 'value');

      expect(result('next value')).toEqual({
        $$part: result.id,
        type: 'UPDATE_PRIMITIVE',
        value: 'next value',
      });
    });

    it('should get the correct value from state', () => {
      const result = part('primitive', 'value');
      const getState = createMockGetState(result);

      expect(result.g(getState)).toBe('value');
    });

    it('should return the correct initial state when no state exists', () => {
      const result = part('primitive', 'value');

      expect(result.r(undefined, {})).toBe('value');
    });

    it('should derive the correct next state based on the action', () => {
      const result = part('primitive', 'value');
      const action = result('next value');

      expect(result.r(result.i, action)).toBe('next value');
    });

    it('should create the action to set the next value in state', () => {
      const result = part('primitive', 'value');
      const getState = createMockGetState(result);

      expect(result.s(mockDispatch, getState, 'next value')).toEqual(
        result('next value')
      );
    });
  });
});
