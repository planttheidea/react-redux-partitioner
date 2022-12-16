# react-redux-partitioner

A simple and performant way to manage Redux state.

- [react-redux-partitioner](#react-redux-partitioner)
  - [Premise](#premise)
  - [Requirements:](#requirements)
  - [Usage](#usage)
    - [Store setup](#store-setup)
  - [Hooks](#hooks)
    - [`usePart`](#usepart)
    - [`usePartValue`](#usepartvalue)
    - [`usePartUpdate`](#usepartupdate)
  - [Part types](#part-types)
    - [Stateful Parts](#stateful-parts)
      - [Action creators](#action-creators)
      - [Stateful Update Parts](#stateful-update-parts)
    - [Select Parts](#select-parts)
      - [Use outside of components](#use-outside-of-components)
      - [Non-Part selectors](#non-part-selectors)
      - [Async selectors](#async-selectors)
    - [Update Parts](#update-parts)
    - [Proxy Parts](#proxy-parts)
      - [Non-Part proxies](#non-part-proxies)
  - [Use with other reducers](#use-with-other-reducers)
  - [Store enhancements](#store-enhancements)
    - [Immutable updates](#immutable-updates)
    - [`getState`](#getstate)
    - [`subscribe`](#subscribe)
    - [`subscribeToDispatch`](#subscribetodispatch)
    - [`subscribeToPart`](#subscribetopart)
    - [Batched notification of subscribers](#batched-notification-of-subscribers)
  - [Related libraries](#related-libraries)

## Premise

[Redux](https://redux.js.org/) is a popular global state manager that is extremely powerful and useful in a variety of use-cases. However, its lack of opinionation often requires teams to develop or use conventions to streamline additions, which results in a lot of "reinventing the wheel" or adopting a common community convention like [Redux Toolkit](https://redux-toolkit.js.org/). Also, due to its top-down update model, performance can degrade as the size of state grows because all components are listening for all state changes and doing work to determine if rendering needs to occur.

Recently, more atomic state managers like [Recoil](https://recoiljs.org/) and [jotai](https://jotai.org/) have become popular because they take a bottom-up approach to state management. Creation of these "atoms" is simple and straightforward, and unlike Redux's top-down model, updates for specific parts of state can be targeted only to components who are using that state. The consumption convention often aligns with the `React.useState` convention, which is familiar and approachable. However, these managers make it very difficult (in some cases, impossible) to work with outside the scope of React, and they lack a centralized pipeline that help with edge-case requirements.

`react-redux-partitioner` attempts to bridge the gap between these two approaches. You can build your state atomically, and have it easily managed into a single Redux store. Components only perform work when the specific part of state they care about change, which improves performance (the larger the scale, the bigger the gains). All state updates go through the Redux dispatch pipeline, which allows for the full power of Redux to be used. It naturally ties in with common Redux approaches like thunks, and can also work in tandem with traditional reducer structures. It can work side-by-side with `react-redux`, or even replace it entirely if you have no need for `connect`.

## Requirements:

- `react` - at least v16.8 (when hooks were introduced)
- `redux` - at least v4
- `redux-thunk` - official middleware of `redux`, automatically included when using default `configureStore` setups

If using TypeScript, it is recommended to use at least v4.7 (but preferrably latest). A lot of inference and tuple use drives the typing, and support is missing from older TS versions.

## Usage

```tsx
import { usePart } from 'react-redux-partitioner';
import { descriptionPart, titlePart, todosPart } from './store';

function Title() {
  const [title] = usePart(titlePart);

  return <h1>{title}</h1>;
}

function Description() {
  const [description] = usePart(descriptionPart);

  return <h2>{description}</h2>;
}

function TodoList() {
  const [todos, updateTodos] = usePart(todosPart);

  const inputRef = useRef<HTMLInputElement>(null);
  const handleClick = useCallback(() => {
    updateTodos((todos) => [
      ...todos,
      { id: todos.length, value: inputRef.current!.value },
    ]);
    inputRef.current!.value = '';
  }, [updateTodos]);

  return (
    <div>
      <aside>
        <input ref={inputRef} />
        <button onClick={handleClick}>Add todo</button>
      </aside>

      <br />

      <section>
        {todos.map((todo) => (
          <div key={todo.id} data-id={todo.id}>
            {todo.value}
          </div>
        ))}
      </section>
    </div>
  );
}
```

`usePart` provides the standard `useState` interface for both reads and writes, but there are [other hooks](#hooks) for more targeted use-cases as needed.

### Store setup

Create the parts of state involved, and add them to the store:

```ts
import { configureStore } from '@reduxjs/toolkit';
import { createPartitioner, part } from 'react-redux-partitioner';

export type Todo = { id: number; value: string };

export const titlePart = part('title', 'My todos');
export const descriptionPart = part('description', 'A simple list of todos');
export const todosPart = part('todos', [] as Todo[]);

const { enhancer, reducer } = createPartitioner({
  parts: [titlePart, descriptionPart, todosPart] as const,
});

export const store = configureStore({ reducer, enhancers: [enhancer] });
```

Wrap your app in a `Provider`, which receives the `store`:

```tsx
import { Provider } from 'react-redux-partitioner';
import { store } from './store';

export function App() {
  return (
    <Provider store={store}>
      <MyApp />
    </Provider>
  );
}
```

There are also [additional enhancements to the store object](#store-enhancements) if needed outside the scope of React.

## Hooks

### `usePart`

Returns a `useState`-like Tuple, where the first item is the value of the Part, and the second is the update method for the Part.

```tsx
const [todos, updateTodos] = usePart(todosPart);

const addTodo = useCallback(
  (todo) => updateTodos((prev) => [...prev, todo]),
  [updateTodos]
);
const resetTodos = useCallback(() => updateTodos([]), [updateTodos]);

return (
  <div>
    {todos.map((todo) => (
      <Todo key={todo.value} {...todo} />
    ))}
  </div>
);
```

Whenever the state for the Part passed updates, the component will rerender. If using [Select Parts](#select-parts) or [Proxy Parts](#proxy-parts), the component will rerender if any of the upstream dependencies for the selector update. Also, notice that the update method provided does not need to be wrapped in a `dispatch()` call as in `react-redux`; it is already bound to the store's `dispatch` method for you.

Please note that when using [Select Parts](#select-parts) or [Update Parts](#update-parts), only the items associated with those Parts will be available. This means that for Select Parts the update method will be a no-op, and for Update Parts the value will be `undefined`.

### `usePartValue`

Returns the value of the Part only. This is a convenience hook for when performing updates within the scope of the component is not required.

```tsx
const todos = usePartValue(todosPart);

return (
  <div>
    {todos.map((todo) => (
      <Todo key={todo.value} {...todo} />
    ))}
  </div>
);
```

Whenever the state for the Part passed updates, the component will rerender. If using [Select Parts](#select-parts) or [Proxy Parts](#proxy-parts), the component will rerender if any of the upstream dependencies for the selector update.

Please note that when using [Update Parts](#update-parts) this will return `undefined`.

### `usePartUpdate`

Returns the update method of the Part only. This is a convenience hook for when reading the values within the scope of the component is not required. This is also considered a performance benefit, as changes to the Part value in state would cause additional re-renders with `usePart`, but would not with `usePartUpdate`.

```ts
const updateTodos = usePartUpdate(todosPart);

const addTodo = useCallback(
  (todo) => updateTodos((prev) => [...prev, todo]),
  [updateTodos]
);
const resetTodos = useCallback(() => updateTodos([]), [updateTodos]);
```

Notice that the update method provided does not need to be wrapped in a `dispatch()` call as in `react-redux`; it is already bound to the store's `dispatch` method for you.
Also, please note that when using [Select Parts](#select-parts) this will return a no-op method.

## Part types

### Stateful Parts

These are the values stored in Redux state, and the core driver of rendering changes.

```ts
const statefulPart = part('partName', 'initial value');
```

This will create what is considered a "Primitive Part", in that it is the most granular Stateful Part stored. Applying the above to your store would create a `partName` property on the state object (`getState().partName`). However, these can be composed into namespaces via composition if the second parameter is an array of Parts:

```ts
const composedStatefulPart = part('namespace', [statefulPart]);
```

This will mutate the Parts passed to now be under a parent key, with the top-level `namespace` being the owner of all its primitive Parts. Therefore, if you wanted to access the Primitive Part above, it would now be `getState().namespace.partName`. Subscription and access to the nested Primitive Parts remain unchanged, and this composition can be as deep as you wish:

```ts
const idPart = part('id', 1234);
const firstNamePart = part('first', 'Testy');
const lastNamePart = part('last', 'McTesterson');
const namePart = part('name', [firstNamePart, lastNamePart]);
const userPart = part('user', [idPart, namePart]);
```

You can also create a Stateful Part with an object configuration, if desired:

```ts
const statefulPart = part({ name: 'partName', initialState: 'initial value' });
const composedStatefulPart = part({ name: 'namespace', parts: [statefulPart] });
```

#### Action creators

If you want to update the state of the Part outside the scope of a React component, the Parts returned are action creators:

```ts
store.dispatch(idPart(2345));
```

This can come in handy when used in combination with other third-party libraries, such as [`redux-saga`](https://redux-saga.js.org/) or [thunks](https://redux.js.org/usage/writing-logic-thunks), or in the context of a [Redux middleware](https://redux.js.org/understanding/history-and-design/middleware). Also helpful is the fact that the `toString()` method on the part will return its action type. This allows for convenient use with utilities like `take` in `redux-saga`:

```ts
yield takeLatest(idPart);
```

Or when building non-Part action handlers for reducers, a la [`redux-actions`](https://redux-actions.js.org/api/handleaction#handleactionsreducermap-defaultstate):

```ts
const nonPartReducer = handleActions(
  {
    [userPart]: (_state, action) => ({
      online: !!action.value?.id,
    }),
  },
  { online: false }
);
```

#### Stateful Update Parts

Even though Stateful Parts are themselves [action creators](#action-creators), they have a fairly generic Redux action type applied (`${partOwner}/UPDATE_${partName}`). This means that if you created state as such:

```ts
const descriptionPart = part('description', '');
const idPart = part('id', '');
const userPart = part('user', [idPart]);

const partitioner = createPartitioner({
  parts: [descriptionPart, userPart] as const,
});
```

The action types for the "native" updaters would be:

- `descriptionPart` => `description/UPDATE_DESCRIPTION`
- `idPart` => `user/UPDATE_ID`
- `userPart` => `user/UPDATE_USER`

If you follow the [Redux Style Guide](https://redux.js.org/style-guide/#model-actions-as-events-not-setters), then you may want to describe updates based on their context, or provide more convenient action creators to reduce developer friction. This is available with the `update` method on the returned Part:

```ts
const activePart = part('active', false);

const activate = activePart.update('ACTIVATED', () => true);
const deactivate = activePart.update('DEACTIVATED', () => false);
const toggleActive = activePart.update(
  'ACTIVE_TOGGLED',
  () => (prevActive) => !prevActive
);
```

`part.update()` receives the custom `type` and optionally the method used to derive the next value, and return a custom [Update Part](#update-parts). In the above example, `activatePart` / `deactivatePart` are hard-coding next state types as `true` / `false`, and in the case of `toggleActivePart` it is using currying to derive the next state based on the previous state just as you would passing a function to the update method returned from `usePart`. The custom action types are also automatically namespaced for the Part owner, just as the native action types are.

That said, the logic of these stateful updaters can be as complex as required:

```ts
const userPart = part('user', [idPart, namePart]);
const modifyUserPart = userPart.update(
  'USER_MODIFIED',
  (nextId?: string, nextName?: string) => (prevUser) => {
    const { id: prevId, name: prevName } = prevUser;

    const nextUser = {
      id: nextId ?? prevId,
      name: { ...prevName },
    };

    if (nextName) {
      const [nextFirst, nextLast] = nextName.split(' ');

      nextUser.name.first = nextFirst;
      nextUser.name.last = nextLast;
    }

    // By returning original reference, no state updates will occur.
    return deepEqual(prevUser, nextUser) ? prevUser : nextUser;
  }
);
```

### Select Parts

Often an application leverages derived data, which is not stored persistently in state but is used for rendering data that combines or transforms the data that is in state. For this, a Select Part can be used:

```ts
const priorityTodosPart = part([todosPart], (todos) =>
  todos.filter((todo) => todo.value.endsWith('(P)'))
);
```

In this case, the selector will run every time `todosPart` updates. It should also be noted that any selectable dependency can be used, so selectors can be composed:

```ts
const hasPriorityTodosPart = part(
  [priorityTodosPart],
  (priorityTodos) => priorityTodos.length > 0
);
```

Use in components:

```tsx
function TodoList() {
  const [todos, updateTodos] = usePart(todosPart);
  const priorityTodos = usePartValue(priorityTodosPart);
  const [onlyPriority, setOnlyPriority] = useState(false);

  const todosListed = onlyPriority ? priorityTodos : todos;
```

Notice above the [`usePartValue` hook](#usepartvalue) is used instead of `usePart`. While both hooks will work, it is generally a good convention to use `usePartValue` with Select Parts since the update method cannot be used.

You can also create a Select Part with an object configuration, if desired:

```ts
const priorityTodosPart = part({
  parts: [todosPart],
  get: (todos) => todos.filter((todo) => todo.value.endsWith('(P)')),
});
```

The object configuration is the only way to provide a custom equality checker for the selector:

```ts
const priorityTodosPart = part({
  parts: [todosPart],
  get: (todos) => todos.filter((todo) => todo.value.endsWith('(P)')),
  isEqual: (prev, next) =>
    prev.length === next.length &&
    next.every((item, index) => next === prev[index]),
});
```

#### Use outside of components

You can also call the selector outside the scope of a component:

```ts
const priorityTodos = priorityTodosPart(store.getState());
```

Since the selector receives the state object as the first parameter, you can use it in combination with other utilities such as [`reselect`](https://github.com/reduxjs/reselect) or `select` from [`redux-saga`](https://redux-saga.js.org/):

```ts
const priorityTodos = yield select(priorityTodosPart);
```

However, unlike traditional selectors which can receive additional arguments, Select Part selectors will only ever receive the state. Therefore, if you want to use this in combination with other values, you'll need to create a wrapping selector. Example using `reselect`:

```ts
import { select } from 'redux-saga/effects';
import { createSelector } from 'reselect';

const selectMatchingPriorityTodos = createSelector(
  priorityTodosPart,
  (_: State, searchParam: string) => searchParam,
  (todos, searchParam) =>
    todos.filter((todo) => todo.value.inclures(searchParam))
);

const priorityTodos = yield select(selectMatchingPriorityTodos, searchParam);
```

#### Non-Part selectors

You can also create a Select Part that is not based on any specific Parts, but rather will execute on any state change:

```ts
const priorityTodosPart = part((todos) =>
  todos.filter((todo) => todo.value.endsWith('(P)'))
);
```

This is usually only helpful when `react-redux-partitioner` is used in combination with other traditional reducers, and the state object contains more than just Stateful Parts. If you are exclusively using Parts for state, then you should prefer to pass the list of Part dependencies, as it will improve render performance.

#### Async selectors

Because applications often rely on asynchronous data, having a convenient mechanism to handle this asynchronous data can be helpful when rendering. As such, when the result of a selector, or any dependency for that selector, is async, a `Promise` will be returned from the selector.

```ts
const remoteTodosPart = usePart([idPart], async (getState) => {
  const id = getState(idPart);
  const response = await fetch(`https://my.url.com/${id}`);

  const todos: Todo[] = await response.json();

  return todos;
});
const priorityTodosPart = part([selectTodos], (todos) =>
  todos.filter((todo) => todo.value.endsWith('(P)'))
);
```

This `Promise` result is supported by`React.Suspense` when used with `usePart` or `usePartValue`.

```tsx
function Todos() {
  const todos = usePartValue(remoteTodosPart);
  const priorityTodos = usePartValue(priorityTodosPart);
  const [onlyPriority, setOnlyPriority] = useState(false);

  const todosListed = onlyPriority ? priorityTodos : todos;
  ...
}

function App() {
  return (
    <Suspense fallback={<div>Loading todos...</div>}>
      <Todos />
    </Suspense>
  );
}
```

### Update Parts

Sometimes there is complex logic required for performing updates to multiple Parts of state that are unrelated. In these cases, an Update Part can be created.

```tsx
const resetTodos = todosPart.update('RESET_TODOS', () => []);
const resetAppPart = part(
  null,
  (dispatch, getState, nextTitle: string, nextDescription: string) => {
    if (nextTitle) {
      dispatch(titlePart(nextTitle));
    }

    if (nextDescription) {
      dispatch(descriptionPart(nextDescription));
    }

    dispatch(resetTodos());
  }
);

function Reset() {
  const resetApp = usePartUpdate(resetAppPart);

  return (
    <button onClick={() => resetApp('Next title', 'Next description')}>
      Reset App
    </button>
  );
}
```

Notice that `null` is passed to `part` as the first parameter; this identifies that there is no selector and therefore is an Update Part (in comparison to a [Proxy Part](#proxy-parts), which receives both). Also, notice that `dispatch` and `getState` are injected as the first two parameters to the method when used via `usePartUpdate`. This is because the Update Part works as a [thunk](https://redux.js.org/usage/writing-logic-thunks):

```ts
const fooUpdatePart = part(null, (dispatch, _getState, nextValue: string) =>
  dispatch(fooPart(nextValue))
);
// is functionallty equivalent to
const fooUpdatePart =
  (nextValue: string) => (dispatch: Dispatch, _getState: GetState) =>
    dispatch(fooPart(fooValue));
```

This allows for convenient use both in and out of a component context:

```ts
store.dispatch(resetAppPart('Next title', 'Next description'));
```

Please note that `extraArgument` from `redux-thunk` is not supported.

You can also create an Update Part with an object configuration, if desired:

```ts
const resetAppPart = part({
  set: (dispatch, getState, nextTitle: string, nextDescription: string) => {
    if (nextTitle) {
      dispatch(titlePart(nextTitle));
    }

    if (nextDescription) {
      dispatch(descriptionPart(nextDescription));
    }

    dispatch(resetTodos());
  },
});
```

### Proxy Parts

Combining the power of [Select Parts](#select-parts) and [Update Parts](#update-parts), Proxy Parts allow full manipulation of state without separate storage.

```tsx
const fullNamePart = part(
  [firstNamePart, lastNamePart],
  (firstName, lastName) => `${firstName} ${lastName}`,
  (dispatch, _, nextName: string) => {
    const [first, last] = nextName.split(' ');

    dispatch(firstNamePart(first));
    dispatch(lastNamePart(last));
  }
);

function Name() {
  const [fullName, updateFullName] = usePart(fullNamePart);

  return (
    <div>
      <span>{fullName}</span>
      <button onClick={() => updateFullName('Next Name')}>Set next name</button>
    </div>
  );
}
```

One thing to note is that, unlike other Parts, a Proxy Part is not callable as a function. This is because it serves two distinct and equal purposes (select and update). However, if you want to use those outside of a React context, then you can access each with the respective `select` and `update` properties:

```ts
const fullName = fullNamePart.select(store.getState());
store.dispatch(fullNamePart.update('Next name'));
```

You can also create a Proxy Part with an object configuration, if desired:

```ts
const fullNamePart = part({
  parts: [firstNamePart, lastNamePart],
  get: (firstName, lastName) => `${firstName} ${lastName}`,
  set: (dispatch, _, nextName: string) => {
    const [first, last] = nextName.split(' ');

    dispatch(firstNamePart(first));
    dispatch(lastNamePart(last));
  },
});
```

The object configuration is the only way to provide a custom equality checker for the selector:

```ts
const fullNamePart = part({
  parts: [firstNamePart, lastNamePart],
  get: (firstName, lastName) => ({ firstName, lastName }),
  set: (dispatch, _, nextName: string) => {
    const [first, last] = nextName.split(' ');

    dispatch(firstNamePart(first));
    dispatch(lastNamePart(last));
  },
  isEqual: (prev, next) =>
    prev.firstName === next.firstName && prev.lastName === next.lastName,
});
```

#### Non-Part proxies

You can also create a Proxy Part that is not based on any other Parts, but rather will execute on any state change.

```ts
const fullNamePart = part(
  (firstName, lastName) => `${firstName} ${lastName}`,
  (dispatch, _, nextName: string) => {
    const [first, last] = nextName.split(' ');

    dispatch(firstNamePart(first));
    dispatch(lastNamePart(last));
  }
);
```

This is usually only helpful when `react-redux-partitioner` is used in combination with other traditional reducers, and the state object contains more than just Stateful Parts. If you are exclusively using Parts for state, then you should prefer to pass the list of Part dependencies, as it will improve render performance.

## Use with other reducers

Sometimes it is necessary to combine Part-based state with reducers that do not use parts, for example when using a third-party library or during migration. In this case, you can provide the non-Parts reducer when creating the partitioner, and both will be used:

```ts
import { createPartitioner } from 'react-redux-partitioner';
import { reducer as existingReducer } from './reducer';
import { parts } from './parts';

export default createPartitioner({ parts, otherReducer: existingReducer });
```

If you are passing a reducer map to `configureStore` in `@reduxjs/toolkit`, or using [`combineReducers`](https://redux.js.org/api/combinereducers), `react-redux-partitioner` will accept this reducer map as well, building the other reducer for you:

```ts
import { createPartitioner } from 'react-redux-partitioner';
import { countReducer as count, userReducer as user } from './reducers';
import { parts } from './parts';

export default createPartitioner({ parts, otherReducer: { count, user } });
```

## Store enhancements

### Immutable updates

While Redux embraces the _convention_ of immutability, it does not _enforce_ it in the implementation, and therefore creates the need to manually write code that enforces it. `react-redux-partitioner` embraces _enforcement_ of that immutability, which can have subtle but distinct differences in output:

1. When the reference to a part in state is the same as that in state, state will not change.
2. When the state object has not changed, subscribers to the store or any specific Part will not be notified.

It is very common to "code around" these in Redux, so you may not even be aware that you are gating a dispatch on the value being different, or returning a conditional `state.value === action.payload ? state : { ...state, value: payload }` in your action handlers to prevent unnecessary state updates. With `react-redux-partitioner`, this is built in, which should reduce the complexity of your code. That said, it differs from standard Redux, which will always eagerly update state, and notify subscribers on every dispatch regardless of state changes, so it is something to be aware of.

### `getState`

In standard Redux, `getState` accepts no arguments and returns the entire state object. With the enhancer, this method is enhanced to support receiving a selectable Part and returning that Part's value. This can either be the value stored in state for Stateful Parts, or the derived value from [Select Parts](#select-parts) or [Proxy Parts](#proxy-parts):

```ts
const todos = store.getState(todosPart);
```

If no parameter is passed, it will return the entire state object, just as it does in standard Redux:

```ts
const state = store.getState();
```

### `subscribe`

The standard Redux `subscribe` method will notify whenever something has dispatched, regardless of whether state changed or not. Since `react-redux-partitioner` takes an opinionated stance regarding immutable state changes, `subscribe` has been updated to reflect this to only notify when a state value changes. In addition, if a [custom notifier is applied for batching](#batched-notification-of-subscribers), notification of those subscribers will be batched.

```ts
const todosPart = part('todos', [] as string[]);
const { enhancer, reducer } = createPartitioner({
  parts: [todosPart] as const,
});
const store = configureStore({ reducer, enhancers: [enhancer] });

store.subscribe(() => {
  console.log('state changed!');
});

store.dispatch({ type: 'FOO' }); // listener not called
store.dispatch(todosPart(['do stuff'])); // 'state changed!'
```

If you have listeners that rely on every dispatch and not just every state change, or wish to avoid any batching mechanics, you can use [`subscribeToDispatch`](#subscribetodispatch), which refers to the original `store.subscribe()` method.

### `subscribeToDispatch`

A reference to standard Redux `store.subscribe()` method, which will notify eagerly whenever a `dispatch` occurs regardless of whether state changes.

```ts
const todosPart = part('todos', [] as string[]);
const { enhancer, reducer } = createPartitioner({
  parts: [todosPart] as const,
});
const store = configureStore({ reducer, enhancers: [enhancer] });

store.subscribeToDispatch(() => {
  console.log('dispatched!');
});

store.dispatch({ type: 'FOO' }); // 'dispatched!'
store.dispatch(todosPart(['do stuff'])); // 'dispatched!'
```

### `subscribeToPart`

Subscribe to changes specific to a Part, ignoring changes to other Parts in state. This works the same as [the `subscribe` method provided](#subscribe), in that only Part state changes will trigger a notification, and those notifications will be batched if a [custom notifier is applied](#batched-notification-of-subscribers).

```ts
const unsubscribe = store.subscribeToPart(todosPart, () => {
  console.log('todos updated', store.getState(todosPart));
});
```

### Batched notification of subscribers

A common use-case in Redux is to batch notification of subscribers to reduce the number of renders driven by state updates, often with the popular [`redux-batched-subscribe`](https://github.com/tappleby/redux-batched-subscribe) library. Because this is such a common use-case, and because the subscription model has changed to handle Part-specific subscriptions, this is now available as a convenient add-on when creating the enhancer to debounce subscription notifications for both the entire store and specific Parts.

```ts
import debounce from 'lodash/debounce';
import { createPartitioner } from 'react-redux-partitioner';
import parts from './parts';

const debouncedNotify = debounce((notify) => notify(), 0);
const enhancer = createPartitioner({ parts, notifier: debounceNotify });
```

If using `redux-batched-subscribe`, it is recommended to remove it in favor of the enhancer batching, since their subscription models will conflict.

## Related libraries

- [Redux](https://redux.js.org/): Simple, powerful centralized state manager, one of the most commonly-used across the ecosystem.
- [Redux Toolkit](https://redux-toolkit.js.org/): Opinionated approach to Redux, eliminating much of the boilerplate and driving a common convention.
- [jotai](https://jotai.org/): Atomic state manager, inspiration for much of the `react-redux-partitioner` API and features.
- [Recoil](https://recoiljs.org/): Atomic state manager by Facebook, community driver for atomic state management in general.
- [zustand](https://github.com/pmndrs/zustand): Barebones centralized state manager, alternative to Redux.
