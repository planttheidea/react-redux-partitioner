import { part } from '../../../src';

export interface Todo {
  complete: boolean;
  id: number;
  value: string;
}

export const todosPart = part('todos', [] as Todo[]);

export const addTodoPart = todosPart.update(
  'add',
  (value: string) => (prev) =>
    [...prev, { complete: false, id: prev.length, value }]
);
export const clearTodosPart = todosPart.update('clear', () => []);
export const removeTodoPart = todosPart.update(
  'remove',
  (todo: Todo) => (prev) => prev.filter((existingTodo) => existingTodo !== todo)
);
export const toggleTodoCompletePart = todosPart.update(
  'toggle-complete',
  (todo) => (prev) =>
    prev.map((existingTodo) =>
      existingTodo === todo
        ? { ...todo, complete: !todo.complete }
        : existingTodo
    )
);

export const selectTodos = part([todosPart], (todos) => todos);
