import styled from '@emotion/styled';
import { DARK_GRAY, LIGHT_GRAY, WHITE } from '../styles';

export default styled.button`
  background-color: inherit;
  border: 1px solid ${LIGHT_GRAY};
  border-radius: 5px;
  box-shadow: none;
  color: ${DARK_GRAY};
  cursor: pointer;
  font-size: 16px;
  height: inherit;
  margin-left: 10px;
  min-height: 30px;
  min-width: 100px;

  &:hover {
    background-color: ${LIGHT_GRAY};
    color: ${WHITE};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;

    &:hover {
      background-color: inherit;
      color: ${DARK_GRAY};
    }
  }
`;
