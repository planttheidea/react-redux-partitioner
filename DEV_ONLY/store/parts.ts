import { part } from '../../src';

export const todosPart = part('todos', {
  initialState: [] as string[],
});
export const titlePart = part('title', { initialState: 'Todos' });

export const conditionalUpdate = part(
  null,
  (_getState, dispatch, nextTitle) => {
    if (typeof nextTitle !== 'string') {
      return console.error('Invalid title');
    }

    return dispatch(titlePart.action(nextTitle));
  }
);
export const resetTodosUpdate = part(null, (_getState, dispatch) =>
  dispatch(todosPart.action([]))
);

export const activeTogglePart = part('active', false);
export const deactivateToggleAction = () =>
  activeTogglePart.action(false, 'deactivating toggle');
export const activateToggleAction = () =>
  activeTogglePart.action(true, 'activating toggle');

export const parentPart = part('parent', {
  partitions: [todosPart, titlePart] as const,
});

export const firstNamePart = part('first', 'Testy');
export const lastNamePart = part('last', 'McTesterson');
export const namePart = part('name', firstNamePart, lastNamePart);
export const fullNameSelect = part(
  [firstNamePart, lastNamePart],
  (firstName, lastName) => `${firstName} ${lastName}`
);
export const idPart = part('id', {
  initialState: 'asdfsfdasfdsdsgafds',
});
export const userPart = part('user', {
  partitions: [idPart, namePart] as const,
});

export const descriptionPart = part('description', {
  initialState: 'Hello!',
});

export const storeParts = [
  parentPart,
  descriptionPart,
  userPart,
  activeTogglePart,
] as const;
