import { Global, css } from '@emotion/react';
import { Provider } from '../../src';
import Main from './components/Main';
import { store } from './store';

const globalStyles = css`
  *,
  *:before,
  *:after {
    box-sizing: border-box;
    font-family: Helvetica, Arial, Sans-Serif;
    position: relative;
  }

  body {
    margin: 0;
    overflow: hidden;
    padding: 0;
  }
`;

export default function App() {
  return (
    <Provider store={store}>
      <Global styles={globalStyles} />
      <Main />
    </Provider>
  );
}
