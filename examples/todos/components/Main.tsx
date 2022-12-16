import React from 'react';
import styled from '@emotion/styled';
import Entry from './Entry';
import Todos from './Todos';

import { DARK_GRAY, WHITE } from '../styles';
import { usePartValue } from '../../../src';
import { titlePart } from '../store/title';
import { descriptionPart } from '../store/description';

const Contents = styled.main`
  background-color: rgb(242, 215, 191);
  color: ${DARK_GRAY};
  height: 100vh;
  overflow: auto;
  margin: 0;
  width: 100vw;
`;

const Title = styled.h1`
  font-size: 48px;
  text-align: center;
  font-weight: normal;
  margin-bottom: 0;
`;

const Subtitle = styled.h2`
  font-size: 16px;
  text-align: center;
  font-weight: normal;
`;

const Card = styled.section`
  background-color: ${WHITE};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
  margin: auto;
  max-width: 800px;
  min-width: 400px;
  padding: 20px;
  width: 50%;
`;

function Header() {
  const title = usePartValue(titlePart);
  const description = usePartValue(descriptionPart);

  return (
    <>
      <Title>{title}</Title>
      <Subtitle>{description}</Subtitle>
    </>
  );
}

export default function App() {
  return (
    <Contents>
      <Header />

      <Card>
        <Entry />
        <Todos />
      </Card>
    </Contents>
  );
}
