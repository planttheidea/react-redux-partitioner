import React, { useEffect, useState } from 'react';
import {
  // store,
  storeConfigured as store,
  type ReduxState,
} from './store';

import {
  Provider as ReactReduxPartitionerProvider,
  useDispatch,
  usePart,
  usePartUpdate,
  usePartValue,
  useStore,
} from '../../src';
import {
  activateUpdate,
  activeTogglePart,
  conditionalUpdate,
  deactivateUpdate,
  descriptionPart,
  firstNamePart,
  fullNameProxy,
  idPart,
  lastNamePart,
  newUserUpdate,
  parentPart,
  resetTodosUpdate,
  titlePart,
  todosPart,
  toggleUpdate,
  userProxy,
  userProxySelect,
  userUpdate,
} from './store/parts';

store.subscribe(() => {
  console.log('store changed', store.getState());
});

store.subscribeToDispatch(() => {
  console.log('something was dispatched', store.getState());
});

store.subscribeToPart(descriptionPart, () => {
  console.log('description changed', store.getState(descriptionPart));
});

store.subscribeToPart(userProxy, () => {
  console.log('user changed', store.getState(userProxy));
});

console.log('initial state', store.getState());

store.dispatch(descriptionPart('next description'));

function useAfterTimeout(fn: () => void, ms: number) {
  useEffect(() => {
    setTimeout(fn, ms);
  }, []);
}

function Active() {
  const active = usePartValue(activeTogglePart);

  console.count('active');

  return <div>Active: {String(active)}</div>;
}

function Description() {
  const description = usePartValue(descriptionPart);
  const updateDescription = usePartUpdate(descriptionPart);

  useAfterTimeout(() => updateDescription('better description'), 2000);

  console.count('description');

  return <div>Description: {description}</div>;
}

function Owner() {
  const owner = usePartValue(parentPart);

  console.count('owner');

  return (
    <div>
      <div>Owner title: {owner.title}</div>
      <div>Owner todos: {JSON.stringify(owner.todos)}</div>
    </div>
  );
}

function Status() {
  const store = useStore<ReduxState>();
  const dispatch = useDispatch();
  const [status, setStatus] = useState(store.getState().legacy);

  useEffect(() => {
    return store.subscribe(() => {
      const nextStatus = store.getState().legacy;

      if (nextStatus !== status) {
        setStatus(nextStatus);
      }
    });
  }, [store]);

  useAfterTimeout(() => dispatch({ type: 'LEGACY' }), 3000);

  return <div>Status: {status}</div>;
}

function Title() {
  const title = usePartValue(titlePart);
  const [, setTitle] = usePart(conditionalUpdate);

  useAfterTimeout(() => setTitle(12345), 1000);
  useAfterTimeout(() => setTitle('next title'), 5000);

  console.count('title');

  return <div>Title: {title}</div>;
}

function Todos() {
  const [todos, updateTodos] = usePart(todosPart);

  console.count('todos');

  useAfterTimeout(() => updateTodos(['foo']), 1000);
  useAfterTimeout(
    () => updateTodos((exitingTodos) => [...exitingTodos, 'bar']),
    2000
  );

  // const [, resetTodos] = usePart(resetTodosUpdate);
  // useAfterTimeout(resetTodos, 3000);
  const dispatch = useDispatch();
  useAfterTimeout(() => dispatch(resetTodosUpdate()), 3000);

  return <div>Todos: {JSON.stringify(todos)}</div>;
}

function Toggle() {
  // const setActive = usePartUpdate(activeTogglePart);
  // const toggleActive = useCallback(
  //   () => setActive((prevActive) => !prevActive),
  //   [setActive]
  // );
  // const activate = useCallback(
  //   () => setActive(true),
  //   [setActive]
  // );
  // const deactivate = useCallback(
  //   () => setActive(false),
  //   [setActive]
  // );

  const toggleActive = usePartUpdate(toggleUpdate);
  const activate = usePartUpdate(activateUpdate);
  const [, deactivate] = usePart(deactivateUpdate);

  console.count('toggle');

  return (
    <div>
      <button type="button" onClick={toggleActive}>
        Toggle active
      </button>
      <button type="button" onClick={activate}>
        Activate
      </button>
      <button type="button" onClick={deactivate}>
        Deactivate
      </button>
    </div>
  );
}

function User() {
  const [user] = usePart(userProxy);
  const updateUser = usePartUpdate(userUpdate);

  console.count('user');

  const alsoUser = usePartValue(userProxySelect);

  console.log({ user, alsoUser });

  // useAfterTimeout(() => setUser({ id: 'nextId', name: 'New Name' }), 3500);
  useAfterTimeout(
    () => updateUser({ id: 'nextId', name: { first: 'New', last: 'Name' } }),
    3500
  );

  return <h2>User: {user}</h2>;
}

function UserId() {
  const id = usePartValue(idPart);
  const updateLastName = usePartUpdate(lastNamePart);
  const updateId = usePartUpdate(newUserUpdate);

  useAfterTimeout(() => updateId('lskdjgfslkjghslkfg'), 500);
  useAfterTimeout(() => updateLastName(`O'Testerson`), 1500);

  console.count('user id');

  return <div>Id: {id}</div>;
}

function UserName() {
  const firstName = usePartValue(firstNamePart);
  const lastName = usePartValue(lastNamePart);

  console.count('user name');

  return (
    <div>
      User name: {firstName} {lastName}
    </div>
  );
}

function UserNameStoreSelector() {
  const [fullName, setFullName] = usePart(fullNameProxy);
  // const fullName = usePartValue(fullNameSelect);

  console.count('stored selector');

  useAfterTimeout(() => setFullName({ last: 'Testosterone' }), 7000);

  return <div>Stored selector: {fullName}</div>;
}

export default function App() {
  const [userVisible] = useState(true);
  // const [userVisible, setUserVisible] = useState(true);

  // useAfterTimeout(() => setUserVisible(false), 1000);

  return (
    <ReactReduxPartitionerProvider store={store}>
      <main>
        <h1>App</h1>

        <Active />
        <Toggle />
        <Status />

        <br />

        {userVisible && (
          <>
            <User />

            <UserId />
            <UserName />

            <UserNameStoreSelector />
          </>
        )}

        <br />

        <Title />
        <Description />
        <Todos />

        <br />

        <Owner />
      </main>
    </ReactReduxPartitionerProvider>
  );
}
