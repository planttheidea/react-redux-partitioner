import { part } from '../src';
import {
  isBoundProxyConfig,
  isBoundSelectConfig,
  isComposedConfig,
  isPartAction,
  isPrimitiveConfig,
  isPromise,
  isProxyPart,
  isSelectPart,
  isSelectablePart,
  isSelectablePartsList,
  isSelector,
  isStatefulPart,
  isStatefulPartsList,
  isUnboundProxyConfig,
  isUnboundSelectConfig,
  isUpdateConfig,
  isUpdateablePart,
  isUpdater,
} from '../src/validate';

const primitivePart = part('primitive', 'value');
const composedPart = part('composed', [primitivePart]);
const boundProxyPart = part(
  [primitivePart],
  (primitive) => primitive.toUpperCase(),
  (dispatch, _, nextValue: string) => dispatch(primitivePart(nextValue))
);
const unboundProxyPart = part(
  (getState) => getState(primitivePart).toUpperCase(),
  (dispatch, _, nextValue: string) => dispatch(primitivePart(nextValue))
);
const boundSelectPart = part([primitivePart], (primitive) =>
  primitive.toUpperCase()
);
const unboundSelectPart = part((getState) =>
  getState(primitivePart).toUpperCase()
);
const updatePart = part(null, (dispatch, _, nextValue: string) =>
  dispatch(primitivePart(nextValue))
);

describe('validate', () => {
  describe('inputs', () => {
    it('should validate a promise', () => {
      const promise = Promise.resolve();
      const promiseLike = { then() {} };

      expect(isPromise(promise)).toBe(true);
      expect(isPromise(promiseLike)).toBe(true);
      expect(isPromise(() => {})).toBe(false);
      expect(isPromise(primitivePart)).toBe(false);
    });

    it('should validate a selector', () => {
      const selector = (arg: any) => arg;

      expect(isSelector(selector)).toBe(true);
      expect(isSelectPart(primitivePart)).toBe(false);
    });

    it('should validate an updater', () => {
      const updater = (_dispatch: any, _: any, nextValue: any) => nextValue;

      expect(isUpdater(updater)).toBe(true);
      expect(isUpdater(primitivePart)).toBe(false);
    });
  });

  describe('configs', () => {
    it('should validate a primitive config', () => {
      expect(isPrimitiveConfig({ initialState: 'foo' })).toBe(true);
      expect(isPrimitiveConfig({ parts: [primitivePart] })).toBe(false);
      expect(isPrimitiveConfig(null)).toBe(false);
    });

    it('should validate a composed config', () => {
      expect(isComposedConfig({ parts: [primitivePart] })).toBe(true);
      expect(isComposedConfig({ initialState: 'foo' })).toBe(false);
      expect(isComposedConfig(null)).toBe(false);
    });

    it('should validate a bound select config', () => {
      expect(isBoundSelectConfig({ parts: [primitivePart], get() {} })).toBe(
        true
      );
      expect(isBoundSelectConfig({ get() {} })).toBe(false);
      expect(isBoundSelectConfig({ set() {} })).toBe(false);
      expect(isBoundSelectConfig({ parts: [primitivePart], set() {} })).toBe(
        false
      );
      expect(
        isBoundSelectConfig({ parts: [primitivePart], get() {}, set() {} })
      ).toBe(false);
      expect(isBoundSelectConfig({ get() {}, set() {} })).toBe(false);
      expect(isBoundSelectConfig({ initialState: 'foo' })).toBe(false);
      expect(isBoundSelectConfig(null)).toBe(false);
    });

    it('should validate an unbound select config', () => {
      expect(isUnboundSelectConfig({ get() {} })).toBe(true);
      expect(isUnboundSelectConfig({ set() {} })).toBe(false);
      expect(isUnboundSelectConfig({ get() {}, set() {} })).toBe(false);
      expect(isUnboundSelectConfig({ parts: [primitivePart], get() {} })).toBe(
        false
      );
      expect(isUnboundSelectConfig({ parts: [primitivePart], set() {} })).toBe(
        false
      );
      expect(
        isUnboundSelectConfig({ parts: [primitivePart], get() {}, set() {} })
      ).toBe(false);
      expect(isUnboundSelectConfig({ initialState: 'foo' })).toBe(false);
      expect(isUnboundSelectConfig(null)).toBe(false);
    });

    it('should validate a bound proxy config', () => {
      expect(
        isBoundProxyConfig({ parts: [primitivePart], get() {}, set() {} })
      ).toBe(true);
      expect(isBoundProxyConfig({ parts: [primitivePart], get() {} })).toBe(
        false
      );
      expect(isBoundProxyConfig({ parts: [primitivePart], set() {} })).toBe(
        false
      );
      expect(isBoundProxyConfig({ get() {} })).toBe(false);
      expect(isBoundProxyConfig({ set() {} })).toBe(false);
      expect(isBoundProxyConfig({ get() {}, set() {} })).toBe(false);
      expect(isBoundProxyConfig({ initialState: 'foo' })).toBe(false);
      expect(isBoundProxyConfig(null)).toBe(false);
    });

    it('should validate an unbound proxy config', () => {
      expect(isUnboundProxyConfig({ get() {}, set() {} })).toBe(true);
      expect(isUnboundProxyConfig({ get() {} })).toBe(false);
      expect(isUnboundProxyConfig({ set() {} })).toBe(false);
      expect(isUnboundProxyConfig({ parts: [primitivePart], get() {} })).toBe(
        false
      );
      expect(isUnboundProxyConfig({ parts: [primitivePart], set() {} })).toBe(
        false
      );
      expect(
        isUnboundProxyConfig({ parts: [primitivePart], get() {}, set() {} })
      ).toBe(false);
      expect(isUnboundProxyConfig({ initialState: 'foo' })).toBe(false);
      expect(isUnboundProxyConfig(null)).toBe(false);
    });

    it('should validate an update config', () => {
      expect(isUpdateConfig({ set() {} })).toBe(true);
      expect(isUpdateConfig({ get() {} })).toBe(false);
      expect(isUpdateConfig({ get() {}, set() {} })).toBe(false);
      expect(isUpdateConfig({ parts: [primitivePart], get() {} })).toBe(false);
      expect(isUpdateConfig({ parts: [primitivePart], set() {} })).toBe(false);
      expect(
        isUpdateConfig({ parts: [primitivePart], get() {}, set() {} })
      ).toBe(false);
      expect(isUpdateConfig({ initialState: 'foo' })).toBe(false);
      expect(isUpdateConfig(null)).toBe(false);
    });
  });

  describe('parts', () => {
    it('should validate stateful part', () => {
      expect(isStatefulPart(primitivePart)).toBe(true);
      expect(isStatefulPart(composedPart)).toBe(true);
      expect(isStatefulPart(boundProxyPart)).toBe(false);
      expect(isStatefulPart(unboundProxyPart)).toBe(false);
      expect(isStatefulPart(boundSelectPart)).toBe(false);
      expect(isStatefulPart(unboundSelectPart)).toBe(false);
      expect(isStatefulPart(updatePart)).toBe(false);
    });

    it('should validate stateful parts list', () => {
      expect(isStatefulPartsList([primitivePart])).toBe(true);
      expect(isStatefulPartsList([composedPart])).toBe(true);
      expect(isStatefulPartsList([boundProxyPart])).toBe(false);
      expect(isStatefulPartsList([unboundProxyPart])).toBe(false);
      expect(isStatefulPartsList([boundSelectPart])).toBe(false);
      expect(isStatefulPartsList([unboundSelectPart])).toBe(false);
      expect(isStatefulPartsList([updatePart])).toBe(false);
    });

    it('should validate proxy part', () => {
      expect(isProxyPart(primitivePart)).toBe(false);
      expect(isProxyPart(composedPart)).toBe(false);
      expect(isProxyPart(boundProxyPart)).toBe(true);
      expect(isProxyPart(unboundProxyPart)).toBe(true);
      expect(isProxyPart(boundSelectPart)).toBe(false);
      expect(isProxyPart(unboundSelectPart)).toBe(false);
      expect(isProxyPart(updatePart)).toBe(false);
    });

    it('should validate select part', () => {
      expect(isSelectPart(primitivePart)).toBe(false);
      expect(isSelectPart(composedPart)).toBe(false);
      expect(isSelectPart(boundProxyPart)).toBe(false);
      expect(isSelectPart(unboundProxyPart)).toBe(false);
      expect(isSelectPart(boundSelectPart)).toBe(true);
      expect(isSelectPart(unboundSelectPart)).toBe(true);
      expect(isSelectPart(updatePart)).toBe(false);
    });

    it('should validate selectable part', () => {
      expect(isSelectablePart(primitivePart)).toBe(true);
      expect(isSelectablePart(composedPart)).toBe(true);
      expect(isSelectablePart(boundProxyPart)).toBe(true);
      expect(isSelectablePart(unboundProxyPart)).toBe(true);
      expect(isSelectablePart(boundSelectPart)).toBe(true);
      expect(isSelectablePart(unboundSelectPart)).toBe(true);
      expect(isSelectablePart(updatePart)).toBe(false);
    });

    it('should validate selectable parts list', () => {
      expect(isSelectablePartsList([primitivePart])).toBe(true);
      expect(isSelectablePartsList([composedPart])).toBe(true);
      expect(isSelectablePartsList([boundProxyPart])).toBe(true);
      expect(isSelectablePartsList([unboundProxyPart])).toBe(true);
      expect(isSelectablePartsList([boundSelectPart])).toBe(true);
      expect(isSelectablePartsList([unboundSelectPart])).toBe(true);
      expect(isSelectablePartsList([updatePart])).toBe(false);
    });

    it('should validate updateable part', () => {
      expect(isUpdateablePart(primitivePart)).toBe(true);
      expect(isUpdateablePart(composedPart)).toBe(true);
      expect(isUpdateablePart(boundProxyPart)).toBe(true);
      expect(isUpdateablePart(unboundProxyPart)).toBe(true);
      expect(isUpdateablePart(boundSelectPart)).toBe(false);
      expect(isUpdateablePart(unboundSelectPart)).toBe(false);
      expect(isUpdateablePart(updatePart)).toBe(true);
    });
  });

  describe('actions', () => {
    const primitiveAction = primitivePart('next value');
    const composedAction = composedPart({ primitive: 'next value' });
    const genericAction = { type: 'GENERIC_ACTION' };
    const thunk = () => {};
    const invalid: any = null;

    expect(isPartAction(primitiveAction)).toBe(true);
    expect(isPartAction(composedAction)).toBe(true);
    expect(isPartAction(genericAction)).toBe(false);
    expect(isPartAction(thunk)).toBe(false);
    expect(isPartAction(invalid)).toBe(false);
  });
});
