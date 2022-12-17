import styled from '@emotion/styled';
import { usePartValue } from '../../../src';
import Todo from './Todo';
import { todosPart } from '../store/todos';

const Container = styled.div`
  margin-top: 15px;
  width: 100%;
`;

const NoItems = styled.span`
  display: block;
  text-align: center;
  width: 100%;
`;

export default function Todos() {
  const todos = usePartValue(todosPart);

  return (
    <Container>
      {todos.length ? (
        todos.map((todo) => <Todo key={todo.value} todo={todo} />)
      ) : (
        <NoItems>No todos on the list yet!</NoItems>
      )}
    </Container>
  );
}
