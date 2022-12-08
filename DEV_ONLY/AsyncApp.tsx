import { a, useSpring } from '@react-spring/web';
import { configureStore } from '@reduxjs/toolkit';
import React, { Suspense } from 'react';
import { Provider } from 'react-redux';
import Parser from 'html-react-parser';

import {
  createPartitioner,
  createReducer,
  part,
  usePart,
  usePartUpdate,
  usePartValue,
} from '../src';

type PostData = {
  by: string;
  descendants?: number;
  id: number;
  kids?: number[];
  parent: number;
  score?: number;
  text?: string;
  time: number;
  title?: string;
  type: 'comment' | 'story';
  url?: string;
};

const postIdPart = part('id', 9001);
const incrementPostUpdate = postIdPart.update(
  'INCREMENT_POST',
  () => (prev) => prev + 1
);
const decrementPostUpdate = postIdPart.update(
  'DECREMENT_POST',
  () => (prev) => prev - 1
);

const postUserPart = part('user', 12345);
const postPart = part('post', [postIdPart, postUserPart]);

// const postData = part(async (get) => {
//   const id = get(postIdPart);
const postData = part([postIdPart], async (id) => {
  const response = await fetch(
    `https://hacker-news.firebaseio.com/v0/item/${id}.json`
  );

  // Inject false wait to allow seeing "loading" state
  await new Promise((resolve) => setTimeout(resolve, 250));

  const data: PostData = await response.json();
  return data;
});

const parts = [postPart] as const;
const reducer = createReducer(parts);
const enhancer = createPartitioner(parts);

const store = configureStore({ reducer, enhancers: [enhancer] });

function Id() {
  const [id] = usePart(postIdPart);
  const props = useSpring({ from: { id }, id, reset: true });

  return <a.h1>{props.id.to(Math.round)}</a.h1>;
}

function Next() {
  const prevPost = usePartUpdate(decrementPostUpdate);
  const nextPost = usePartUpdate(incrementPostUpdate);

  return (
    <div>
      <button onClick={prevPost}>&#x2190;</button>
      <button onClick={nextPost}>&#x2192;</button>
    </div>
  );
}

function Post() {
  const { by, text, time, title, url } = usePartValue(postData);

  return (
    <>
      <h2>{by}</h2>
      <h6>{new Date(time * 1000).toLocaleDateString('en-US')}</h6>
      {title && <h4>{title}</h4>}
      {url && <a href={url}>{url}</a>}
      {text && <div>{Parser(text)}</div>}
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <main>
        <h1>App</h1>

        <Id />
        <Next />

        <br />

        <Suspense fallback={<div>Loading post...</div>}>
          <Post />
        </Suspense>
      </main>
    </Provider>
  );
}
