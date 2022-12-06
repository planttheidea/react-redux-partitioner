import { configureStore } from '@reduxjs/toolkit';
import React, { useCallback, useRef, useState } from 'react';
import { Provider } from 'react-redux';
import {
  createPartitioner,
  createReducer,
  part,
  usePart,
  usePartValue,
} from '../src';

const titlePart = part('title', 'My todos list');
const descriptionPart = part('description', 'A simple list of todos');

interface Todo {
  id: number;
  priority: boolean;
  value: string;
}

const todosPart = part('todos', [] as Todo[]);

const parts = [titlePart, descriptionPart, todosPart] as const;
const reducer = createReducer(parts);
const enhancer = createPartitioner(parts);

export const store = configureStore({
  reducer,
  enhancers: [enhancer],
});

function Title() {
  const [title] = usePart(titlePart);

  return <h1>{title}</h1>;
}

function Description() {
  const [description] = usePart(descriptionPart);

  return <h2>{description}</h2>;
}

const priorityTodosPart = part([todosPart], (todos) =>
  todos.filter((todo) => todo.priority)
);

function TodoList() {
  const [todos, setTodos] = usePart(todosPart);
  const priorityTodos = usePartValue(priorityTodosPart);

  const inputRef = useRef<HTMLInputElement>(null);
  const checkboxRef = useRef<HTMLInputElement>(null);

  const [onlyPriority, setOnlyPriority] = useState(false);

  const addTodo = useCallback(() => {
    setTodos((todos) => [
      ...todos,
      {
        id: todos.length,
        priority: checkboxRef.current!.checked,
        value: inputRef.current!.value,
      },
    ]);
    inputRef.current!.value = '';
    checkboxRef.current!.checked = false;
  }, [setTodos]);

  const togglePriorityOnly = useCallback(
    () => setOnlyPriority(!onlyPriority),
    [onlyPriority]
  );

  const todosListed = onlyPriority ? priorityTodos : todos;

  return (
    <div>
      <aside>
        <input ref={inputRef} />
        <label style={{ paddingLeft: 5 }}>
          Priority?
          <input type="checkbox" ref={checkboxRef} />
        </label>

        <div>
          <button onClick={addTodo}>Add todo</button>
        </div>
      </aside>

      <br />

      <section>
        <div>
          <label htmlFor="priority-only" onClick={togglePriorityOnly}>
            Show only priority todos
            <input type="checkbox" id="priority-only" />
          </label>
        </div>

        <br />

        {todosListed.map((todo) => (
          <div key={todo.id} data-id={todo.id}>
            {todo.value}
          </div>
        ))}
      </section>
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <main>
        <Title />
        <Description />

        <TodoList />
      </main>
    </Provider>
  );
}
