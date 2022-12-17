import { useCallback, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { usePartUpdate, usePartValue } from '../../../src';
import Button from './Button';
import { DARK_GRAY, LIGHT_GRAY, WHITE } from '../styles';
import { addTodoPart, clearTodosPart, todosPart } from '../store/todos';

import type { ChangeEvent, KeyboardEvent, MouseEvent } from 'react';

const Container = styled.div`
  display: flex;
  height: 40px;
  width: 100%;
`;

const Input = styled.input`
  background-color: ${WHITE};
  border: 1px solid ${LIGHT_GRAY};
  border-radius: 5px;
  color: ${DARK_GRAY};
  flex-grow: 1;
  font-size: 24px;
  height: inherit;
  margin: 0;
  padding: 10px;

  &:focus {
    box-shadow: 0 0 5px ${LIGHT_GRAY};
    outline: none;
  }
`;

export default function Entry() {
  const inputRef = useRef<HTMLInputElement>(null);

  const addTodo = usePartUpdate(addTodoPart);
  const clearTodos = usePartUpdate(clearTodosPart);
  const [disabled, setDisabled] = useState(true);

  const clearAndFocus = useCallback(() => {
    if (!inputRef.current) {
      return;
    }

    inputRef.current.value = '';
    inputRef.current.focus();

    setDisabled(true);
  }, [inputRef, setDisabled]);

  const onClickAdd = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();

      addTodo(inputRef.current!.value);
      clearAndFocus();
    },
    [inputRef, setDisabled]
  );
  const onClickClear = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();

      clearTodos();
      clearAndFocus();
    },
    [setDisabled]
  );
  const onKeyDownSubmit = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();

        addTodo(inputRef.current!.value);
        clearAndFocus();
      }
    },
    [inputRef]
  );
  const onChangeInput = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const shouldBeDisabled = !event.target.value;

      if (shouldBeDisabled !== disabled) {
        setDisabled(shouldBeDisabled);
      }
    },
    [inputRef, disabled, setDisabled]
  );

  const todos = usePartValue(todosPart);

  return (
    <Container>
      <Input
        autoFocus
        onChange={onChangeInput}
        onKeyDown={onKeyDownSubmit}
        ref={inputRef}
      />

      <Button disabled={disabled} onClick={onClickAdd} type="submit">
        Add
      </Button>
      {!!todos.length && (
        <Button onClick={onClickClear} type="reset">
          Clear
        </Button>
      )}
    </Container>
  );
}
