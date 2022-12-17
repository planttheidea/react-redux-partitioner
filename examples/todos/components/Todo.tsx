import { useCallback } from 'react';
import { usePartUpdate } from '../../../src';
import styled from '@emotion/styled';
import Button from './Button';
import { LIGHT_GRAY } from '../styles';
import {
  type Todo as TodoType,
  removeTodoPart,
  toggleTodoCompletePart,
} from '../store/todos';

const Container = styled.div`
  border-top: 1px dotted ${LIGHT_GRAY};
  display: flex;
  align-items: center;
  padding: 15px 0;
  width: 100%;
`;

type ValueProps = {
  isComplete: boolean;
};

const Value = styled.span`
  display: block;
  flex-grow: 1;
  font-style: ${(props: ValueProps) =>
    props.isComplete ? 'italic' : 'normal'};
  text-decoration: ${(props: ValueProps) =>
    props.isComplete ? 'line-through' : 'none'};
`;

type Props = {
  todo: TodoType;
};

export default function Todo({ todo }: Props) {
  const removeTodo = usePartUpdate(removeTodoPart);
  const toggleTodoComplete = usePartUpdate(toggleTodoCompletePart);

  const onClickComplete = useCallback(() => {
    toggleTodoComplete(todo);
  }, [todo]);
  const onClickRemove = useCallback(() => {
    removeTodo(todo);
  }, [todo]);

  return (
    <Container>
      <Value isComplete={todo.complete}>{todo.value}</Value>

      <Button onClick={onClickComplete} type="button">
        {todo.complete ? 'Restart' : 'Complete'}
      </Button>
      <Button onClick={onClickRemove} type="button">
        Remove
      </Button>
    </Container>
  );
}
