# redux-partitioner

A more pleasant and performant development Redux state manager.

- [redux-partitioner](#redux-partitioner)
  - [Premise](#premise)
  - [Setup](#setup)
  - [Usage example](#usage-example)
  - [Hooks](#hooks)
    - [`usePart`](#usepart)
    - [`usePartValue`](#usepartvalue)
    - [`usePartUpdate`](#usepartupdate)
  - [Part types](#part-types)
    - [Stateful Parts](#stateful-parts)
      - [Stateful Update Parts](#stateful-update-parts)
    - [Select Parts](#select-parts)
      - [Async selectors](#async-selectors)
    - [Update Parts](#update-parts)
    - [Proxy Parts](#proxy-parts)
  - [Store enhancements](#store-enhancements)
    - [`getState`](#getstate)
    - [`subscribeToPart`](#subscribetopart)
    - [Batched notification of subscribers](#batched-notification-of-subscribers)

## Premise

[Redux](https://redux.js.org/) is a very popular global state manager, which is extremely powerful and useful in a variety of use-cases. However, its lack of opinionation often requires convention-driven development, and due to its top-down update model, performance can degrade as the size of state grows because all components are listening for all state changes and doing work to determine if rendering needs to occur.

Recently, more atomic state managers like [Recoil](https://recoiljs.org/) and [jotai](https://jotai.org/) have become popular because they take a bottom-up approach to state management. Unlike Redux's top-down model, updates for specific parts of state can be targeted only to components who are using that state, and the convention that aligns with the React `useState` convention is familiar and approachable.

`redux-partitioner` attempts to bridge the gap between these two approaches. You can build your state atomically, and have it automatically consolidated into a single Redux store. Updates only occur for parts of state that change, avoiding excess work and staying performant at scale. It naturally ties in with common Redux approaches like thunks, and can also work in tandem with traditional reducer structures.

## Setup

```tsx
// create the parts of state involved
import { part } from 'redux-partitioner';

export const titlePart = part('title', 'My todos');
export const descriptionPart = part('description', 'A simple list of todos');

interface Todo {
  id: number;
  value: string;
}
export const todosPart = part('todos', [] as Todo[]);

// create the reducer and store enhancer from these parts
import { createPartitioner, createReducer } from 'redux-partitioner';

const parts = [titlePart, descriptionPart, todosPart] as const;
const reducer = createReducer(parts);
const enhancer = createPartitioner(parts);

// create your store
import { configureStore } from '@reduxjs/toolkit';

const store = configureStore({ reducer, enhancers: [enhancer] });
```

The enhancer will provide some extra goodies on the `store` object which are detailed in [Store enhancements](#store-enhancements), but will also set up the targeted update infrastructure for components.

## Usage example

```tsx
import { usePart } from 'redux-partitioner';
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
  const [todos, setTodos] = usePart(todosPart);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback(() => {
    setTodos((todos) => [
      ...todos,
      { id: todos.length, value: inputRef.current!.value },
    ]);
    inputRef.current!.value = '';
  }, [setTodos]);

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

## Hooks

### `usePart`

Returns a `useState`-like tuple where the first item is the value of the Part, and the second is the update method for the Part.

```ts
const [todos, setTodos] = usePart(todosPart);
```

Please note that when using [Select Parts](#select-parts) or [Update Parts](#update-parts), only the items associated with those parts will be available. This means that for Select parts the update method will be a no-op, and for Update parts the value will be `undefined`.

### `usePartValue`

Returns the value of the Part only. This is a convenience hook for when updates are not needed.

```ts
const todos = usePartValue(todosPart);
```

Please note that when using [Update Parts](#update-parts) this will return `undefined`.

### `usePartUpdate`

Returns the update method of the Part only. This is a convenience hook for when reading the values are not needed, and is considered a performance benefit because changes to the Part state will not cause additional rerenders as it would when using `usePart`.

```ts
const setTodos = usePartUpdate(todosPart);
```

Please note that when using [Select Parts](#select-parts) this will return a no-op method.

## Part types

### Stateful Parts

The most important Parts in your application! These are the values stored in Redux state, and the core driver of rendering changes.

```ts
const statefulPart = part('key', 'initial value');
```

This will create what is considered a "Primitive Part", in that it is the most granular Stateful Part stored. Applying the above to your store as-is would create a `key` property on the state object (`getState().key`). However, these can be composed into namespaces via composition:

```ts
const composedStatefulPart = part('namespace', [statefulPart]);
```

This will mutate the parts passed to now be under a parent key, with the top-level namespace being the owner of all its primitive Parts. Therefore, if you wanted to access the Primitive Part above, it would now be `getState().namespace.key`. Subscription and access to the nested Primitive Parts remain unchanged, and this composition can be as deep as you wish.

```ts
const idPart = part('id', 1234);
const firstNamePart = part('first', 'Testy');
const lastNamePart = part('last', 'McTesterson');
const namePart = part('name', [firstNamePart, lastNamePart]);
const userPart = part('user', [idPart, namePart]);
```

Also, if you want to update the state of the Part outside the scope of a React component, the Parts returned are themselves action creators.

```ts
store.dispatch(idPart(2345));
```

This can come in handy when used in combination with other third-party libraries, such as `redux-saga` or a standard thunk. Also helpful for `redux-saga` is the fact that the `toString()` method on the part will return its action type, which allows for convenient use with utilities like `take`:

```ts
yield takeLatest(idPart);
```

#### Stateful Update Parts

In addition to the [Update Parts](#update-parts) that you can create manually, stateful components can create custom Update Parts for updating their values. This allows you to build action creators that are more flexible and declarative, or contain some business logic.

```ts
const activePart = part('active', false);

const activate = activePart.update('ACTIVATED', () => true);
const deactivate = activePart.update('DEACTIVATED', () => false);
const toggleActive = activePart.update(
  'ACTIVE_TOGGLED',
  () => (prevActive) => !prevActive
);
```

These create custom action types, and can include methods to derive the next state value. In the above example `activatePart` / `deactivatePart` are hard-coding next state types, and in the case of `toggleActivePart` it is using curring to derive the next state based on the previous state just as you would passing a function to the update method returned from `usePart`. However, this is very flexible:

```ts
const userPart = part('user', [idPart, namePart]);
const modifyUser = userPart.update(
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

Often an application leverages derived data, which is not stored persistently in state but is used for rendering data that combines or transforms that which is stored in state. For this, a select Part can be used:

```ts
const selectPriorityTodos = part([todosPart], (todos) =>
  todos.filter((todo) => todo.value.endsWith('(P)'))
);
```

In this case, the selector will run every time `todos` change in state, and if a todo is added with a value of `(P)` on the end, it is considered priority. It then can be used in your components as needed:

```tsx
function TodoList() {
  const [todos, setTodos] = usePart(todosPart);
  const priorityTodos = usePartValue(selectPriorityTodos);
  const [onlyPriority, setOnlyPriority] = useState(false);

  const todosListed = onlyPriority ? priorityTodos : todos;
```

Notice above the [`usePartValue` hook](#usepartvalue) is used instead of `usePart`. While both will work the same, it is generally a good convention to use `usePartValue` with Select Parts since the update method cannot be used.

You can also create a Select Part that is not based on any other Parts, but rather will execute on any state change.

```ts
const selectPriorityTodos = part((todos) =>
  todos.filter((todo) => todo.value.endsWith('(P)'))
);
```

This is mainly helpful when `redux-partitioner` is used in combination with other traditional reducers, and the state object contains more than just Stateful Parts.

#### Async selectors

Because applications often rely on asynchronous data, having a convenient mechanism to handle this asynchronous data can be helpful when rendering. As such, when the result of a selector, or any dependency for that selector, is async, a `Promise` will be returned from the selector.

```ts
const selectTodos = usePart([idPart], async (getState) => {
  const id = getState(idPart);
  const response = await fetch(`https://my.url.com/${id}`);

  const todos: Todo[] = await response.json();

  return todos;
});
const selectPriorityTodos = part([selectTodos], (todos) =>
  todos.filter((todo) => todo.value.endsWith('(P)'))
);
```

This `Promise` result supports `React.Suspense` handling use when used with `usePart`.

```tsx
function Todos() {
  const todos = usePartValue(selectTodos);
  const priorityTodos = usePartValue(selectPriorityTodos);
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
const resetApp = part(
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
  const reset = usePartUpdate(resetApp);

  return (
    <button onClick={() => reset('Next title', 'Next description')}>
      Reset App
    </button>
  );
}
```

Notice that `null` is passed to `part` as the first parameter; this identifies that there is no selector and therefore is an Update Part. Also, you can see that `dispatch` and `getState` are injected as the first two parameters to the method when used via `usePartUpdate`; this is because the Update Part itself is a thunk, and the method passed to `part` is receiving all parameters in the partially-applied method. This also allows for convenient use outself of a hook context, as the part itself is a thunk action creator.

```ts
store.dispatch(resetApp());
```

### Proxy Parts

Combining the power of Select and Update Parts, Proxy Parts allow full manipulation of state without separate storage.

```tsx
const proxyName = part(
  [firstNamePart, lastNamePart],
  (firstName, lastName) => `${firstName} ${lastName}`,
  (dispatch, _, nextName: string) => {
    const [first, last] = nextName.split(' ');

    dispatch(firstNamePart(first));
    dispatch(lastNamePart(last));
  }
);

function Name() {
  const [name, setName] = usePart(proxyName);

  return (
    <div>
      <span>{name}</span>
      <button onClick={() => setName('Next Name')}>Set next name</button>
    </div>
  );
}
```

Notice that `usePart` can be used as if the Proxy Part was itself a member of state.

You can also create a Proxy Part that is not based on any other Parts, but rather will execute on any state change.

```ts
const proxyName = part(
  (firstName, lastName) => `${firstName} ${lastName}`,
  (dispatch, _, nextName: string) => {
    const [first, last] = nextName.split(' ');

    dispatch(firstNamePart(first));
    dispatch(lastNamePart(last));
  }
);
```

This is mainly helpful when `redux-partitioner` is used in combination with other traditional reducers, and the state object contains more than just Stateful Parts.

## Store enhancements

### `getState`

In standard Redux, `getState` accepts no arguments and returns the entire state object. With the enhancer, this method is updated to support receiving a selectable Part and returning that Part's value. This can either be the value stored in state for Stateful Parts, or the derived value from Select or Proxy Parts.

```ts
const todos = store.getState(todosPart);
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
import { createPartitioner } from 'redux-partitioner';
import parts from './parts';

const debouncedNotify = debounce((notify) => notify(), 0);
const enhancer = createPartitioner(parts, debounceNotify);
```

This will debounce subscription notifications for both the entire store and specific Parts.
