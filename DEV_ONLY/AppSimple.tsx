import React from 'react';
import { Provider } from 'react-redux';

import { store } from './store';
import { descriptionPart } from './store/parts';

store.subscribe(() => {
  console.log('update store', store.getState());
});

store.subscribeToPart(descriptionPart, () => {
  console.log('description update', store.getState(descriptionPart));
});

store.dispatch(descriptionPart('New description'));

export default function App() {
  return (
    <Provider store={store}>
      <main>
        <h1>App</h1>
      </main>
    </Provider>
  );
}
