import { ReduxState } from '.';
import { part, usePart } from '../../src';
// import { part } from '../../src';

export const todosPart = part('todos', [] as string[]);
export const titlePart = part({
  name: 'title',
  initialState: 'Todos',
});

export const conditionalUpdate = part(
  null,
  (dispatch, _getState, nextTitle) => {
    if (typeof nextTitle !== 'string') {
      return console.error('Invalid title');
    }

    return dispatch(titlePart(nextTitle));
  }
);
export const resetTodosUpdate = part(null, (dispatch) =>
  dispatch(todosPart([]))
);

export const activeTogglePart = part('active', false);
export const deactivateUpdate = activeTogglePart.update(
  'DEACTIVATE',
  () => false
);
export const activateUpdate = activeTogglePart.update('ACTIVATE', () => true);
export const toggleUpdate = activeTogglePart.update(
  'TOGGLE',
  () => (prev) => !prev
);

export const parentPart = part({
  name: 'parent',
  parts: [todosPart, titlePart],
});

export const firstNamePart = part('first', 'Testy');
export const lastNamePart = part('last', 'McTesterson');
export const namePart = part('name', [firstNamePart, lastNamePart]);
export const fullNameSelect = part(
  [firstNamePart, lastNamePart],
  (firstName, lastName) => `${firstName} ${lastName}`
);

export const idPart = part('id', 'asdfsfdasfdsdsgafds');

export const newUserUpdate = idPart.update('NEW_USER_ID');

export const userPart = part({
  name: 'user',
  parts: [idPart, namePart],
});
export const fullNameProxy = part(
  [firstNamePart, lastNamePart],
  (firstName, lastName) => `${firstName} ${lastName}`,
  (dispatch, _, { first, last }: { first?: string; last?: string }) => {
    if (first) {
      dispatch(firstNamePart(first));
    }

    if (last) {
      dispatch(lastNamePart(last));
    }
  }
);

console.log({ user: userPart.toString(), firstName: firstNamePart.toString() });

export const userProxy = part(
  (getState) => {
    const name = getState(fullNameProxy);
    const id = getState(idPart);
    const legacy = getState<ReduxState>().legacy;

    return `${name} (${id}) - ${legacy}`;
  },
  (dispatch, _, { id, name }: { id?: string; name?: string }) => {
    if (id && name) {
      const [first, last] = name.split(' ');

      dispatch(userPart({ id, name: { first, last } }));
    }
  }
);

export const userProxySelect = part([userProxy], (user) => user);

export const descriptionPart = part({
  name: 'description',
  initialState: 'Hello!',
});

export const storeParts = [
  parentPart,
  descriptionPart,
  userPart,
  activeTogglePart,
] as const;
