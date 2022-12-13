# react-redux-partitioner

A simple and performant way to manage Redux state.

- [react-redux-partitioner](#react-redux-partitioner)
  - [Premise](#premise)
  - [Usage example](#usage-example)
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
      - [Non-Part selectors](#non-part-selectors)
      - [Async selectors](#async-selectors)
    - [Update Parts](#update-parts)
    - [Proxy Parts](#proxy-parts)
      - [Non-Part proxies](#non-part-proxies)
  - [Use with other reducers](#use-with-other-reducers)
  - [Store enhancements](#store-enhancements)
    - [Immutable updates](#immutable-updates)
    - [`getState`](#getstate)
    - [`subscribeToPart`](#subscribetopart)
    - [Batched notification of subscribers](#batched-notification-of-subscribers)

## Premise

[Redux](https://redux.js.org/) is a popular global state manager that is extremely powerful and useful in a variety of use-cases. However, its lack of opinionation often requires teams to develop or use conventions to streamline additions, which results in a lot of "reinventing the wheel" or adopting a common community convention like [Redux Toolkit](https://redux-toolkit.js.org/). Also, due to its top-down update model, performance can degrade as the size of state grows because all components are listening for all state changes and doing work to determine if rendering needs to occur.

Recently, more atomic state managers like [Recoil](https://recoiljs.org/) and [jotai](https://jotai.org/) have become popular because they take a bottom-up approach to state management. Creation of these "atoms" is simple and straightforward, and unlike Redux's top-down model, updates for specific parts of state can be targeted only to components who are using that state. The convention that aligns with the React `useState` convention, which is familiar and approachable. However, these managers are very difficult (in some cases, impossible) to work with outside the scope of React, and they lack a centralized pipeline that help with edge-case requirements.

`react-redux-partitioner` attempts to bridge the gap between these two approaches. You can build your state atomically, and have it automatically consolidated into a single Redux store. Components only perform work when the specific part of state they care about change, which improves performance (the larger the scale, the bigger the gains). All state updates go through the Redux dispatch pipeline, which allows for the full power of Redux to be used. It naturally ties in with common Redux approaches like thunks, and can also work in tandem with traditional reducer structures.

## Usage example

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

## Store setup

```tsx
// create the parts of state involved
import { part } from 'react-redux-partitioner';

export const titlePart = part('title', 'My todos');
export const descriptionPart = part('description', 'A simple list of todos');

interface Todo {
  id: number;
  value: string;
}
export const todosPart = part('todos', [] as Todo[]);

// create the reducer and store enhancer
import { createPartitioner } from 'react-redux-partitioner';

const parts = [titlePart, descriptionPart, todosPart] as const;
const { enhancer, reducer } = createPartitioner({ parts });

// create your store
import { configureStore } from '@reduxjs/toolkit';

const store = configureStore({ reducer, enhancers: [enhancer] });
```

The enhancer will provide some extra goodies on the `store` object which are detailed in [Store enhancements](#store-enhancements), but will also set up the targeted update infrastructure for components.

## Hooks

### `usePart`

Returns a `useState`-like Tuple, where the first item is the value of the Part, and the second is the update method for the Part.

```ts
const [todos, updateTodos] = usePart(todosPart);
```

Please note that when using [Select Parts](#select-parts) or [Update Parts](#update-parts), only the items associated with those Parts will be available. This means that for Select Parts the update method will be a no-op, and for Update Parts the value will be `undefined`.

### `usePartValue`

Returns the value of the Part only. This is a convenience hook for when performing updates within the scope of the component is not required.

```ts
const todos = usePartValue(todosPart);
```

Please note that when using [Update Parts](#update-parts) this will return `undefined`.

### `usePartUpdate`

Returns the update method of the Part only. This is a convenience hook for when reading the values within the scope of the component is not required. This is also considered a performance benefit, as changes to the Part value in state would cause additional re-renders with `usePart`, but would not with `usePartUpdate`.

```ts
const updateTodos = usePartUpdate(todosPart);
```

Please note that when using [Select Parts](#select-parts) this will return a no-op method.

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

Even though Stateful Parts are themselves [action creators](#action-creators), they have a fairly generic Redux action type applied (`UPDATE_${partName}`). If you follow the [Redux Style Guide](https://redux.js.org/style-guide/#model-actions-as-events-not-setters), then you may want to describe updates based on their context, or provide more convenient ones to reduce developer friction. This is available with the `update` method on the Part:

```ts
const activePart = part('active', false);

const activate = activePart.update('ACTIVATED', () => true);
const deactivate = activePart.update('DEACTIVATED', () => false);
const toggleActive = activePart.update(
  'ACTIVE_TOGGLED',
  () => (prevActive) => !prevActive
);
```

`part.update()` receives the custom `type` and optionally the method used to derive the next value, and return a custom [Update Part](#update-parts). In the above example, `activatePart` / `deactivatePart` are hard-coding next state types as `true` / `false`, and in the case of `toggleActivePart` it is using curring to derive the next state based on the previous state just as you would passing a function to the update method returned from `usePart`.

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

In this case, the selector will run every time `todosPart` updates. It then can be used in your components as needed:

```tsx
function TodoList() {
  const [todos, updateTodos] = usePart(todosPart);
  const priorityTodos = usePartValue(priorityTodosPart);
  const [onlyPriority, setOnlyPriority] = useState(false);

  const todosListed = onlyPriority ? priorityTodos : todos;
```

Notice above the [`usePartValue` hook](#usepartvalue) is used instead of `usePart`. While both hooks will work, it is generally a good convention to use `usePartValue` with Select Parts since the update method cannot be used.

You can also call the selector outside the scope of a React tree:

```ts
const priorityTodos = priorityTodosPart(store.getState);
```

Unlike traditional selectors which receive the state object as the first argument, selectors expect the `getState` method itself. Therefore, if you want to use this in combination with other utilities like `select` from [`redux-saga`](https://redux-saga.js.org/), you'll need to create a simple wrapper:

```ts
const priorityTodos = yield select(() => priorityTodosPart(store.getState));
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

This allows for convenient use both in and out of a hook context:

```ts
store.dispatch(resetAppPart('Next title', 'Next description'));
```

Please note that if an `extraArgument` is provided to `redux-thunk`, it will not be available.

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
const fullName = fullNamePart.select(store.getState);
store.dispatch(fullNamePart.update('Next name'));
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
import existingReducer from './reducer';
import parts from './parts';

export default createPartitioner({ parts, otherReducer: existingReducer });
```

If you are passing a reducer map to `configureStore` in `@reduxjs/toolkit`, or using [`combineReducers`](https://redux.js.org/api/combinereducers), `react-redux-partitioner` will accept this reducer map as well, building the other reducer for you:

```ts
import { createPartitioner } from 'react-redux-partitioner';
import { count } from './reducers';
import parts from './parts';

export default createPartitioner({ parts, otherReducer: { count } });
```

## Store enhancements

### Immutable updates

While Redux embraces the _convention_ of immutability, it does not _enforce_ it in the implementation, and therefore creates the need to manually write code that enforces it. `react-redux-partitioner` embraces _enforcement_ of that immutability, which can have subtle but distinct differences in output:

1. When the reference to a part in state is the same as that in state, state will not change.
2. When the state object has not changed, subscribers to the store or any specific Part will not be notified.

It is very common to "code around" these in Redux, so you may not even be aware that you are gating a dispatch on the value being different, or returning a conditional `state.value === action.payload ? state : { ...state, value: payload }` in your action handlers. With `react-redux-partitioner`, this is built in, which should reduce the complexity of your code. That said, it does different from standard Redux, which will always eagerly update state, and notify subscribers on every dispatch regardless of state changes, so it is called out explicitly.

### `getState`

In standard Redux, `getState` accepts no arguments and returns the entire state object. With the enhancer, this method is updated to support receiving a selectable Part and returning that Part's value. This can either be the value stored in state for Stateful Parts, or the derived value from [Select Parts](#select-parts) or [Proxy Parts](#proxy-parts):

```ts
const todos = store.getState(todosPart);
```

If no parameter is passed, it works as it does in standard Redux:

```ts
const state = store.getState();
```

### `subscribeToPart`

The standard Redux `subscribe` method still exists for listeners to all store changes, however you can subscribe to changes for a specific selectable Part with `subscribeToPart`.

```ts
const unsubscribe = store.subscribeToPart(todosPart, () => {
  console.log('todos updated', store.getState(todosPart));
});
```

### Batched notification of subscribers

A common use-case in Redux is to batch notification of subscribers to reduce the number of renders driven by state updates, often with the popular [`redux-batched-subscribe`](https://github.com/tappleby/redux-batched-subscribe) library. Because this is such a common use-case, and because the subscription model has changed to handle Part-specific subscriptions, this is now available as a convenient add-on when creating the enhancer.

```ts
import debounce from 'lodash/debounce';
import { createPartitioner } from 'react-redux-partitioner';
import parts from './parts';

const debouncedNotify = debounce((notify) => notify(), 0);
const enhancer = createPartitioner({ parts, notifier: debounceNotify });
```

This will debounce subscription notifications for both the entire store and specific Parts.
