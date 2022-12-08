import { configureStore } from '@reduxjs/toolkit';
import React, { useEffect } from 'react';
import { Provider } from 'react-redux';

import { createPartitioner, createReducer, part, usePartValue } from '../src';

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
const postUserPart = part('user', 12345);
const postPart = part('post', [postIdPart, postUserPart]);

// const postData = part(async (get) => {
//   const id = get(postIdPart);
//   const response = await fetch(
//     `https://hacker-news.firebaseio.com/v0/item/${id}.json`
//   );
//   const data: PostData = await response.json();
//   return data;
// });
const postData = part([postIdPart], async (id) => {
  const response = await fetch(
    `https://hacker-news.firebaseio.com/v0/item/${id}.json`
  );
  const data: PostData = await response.json();
  return data;
});
const postDataWithUser = part([postData, postUserPart], async (data, user) => {
  return { data, user };
});

const parts = [postPart] as const;
const reducer = createReducer(parts);
const enhancer = createPartitioner(parts);

const store = configureStore({ reducer, enhancers: [enhancer] });

function useAfterTimeout(fn: () => void, ms: number) {
  useEffect(() => {
    setTimeout(fn, ms);
  }, []);
}

function Post() {
  const post = usePartValue(postData);

  console.log(post.then((result) => console.log(result)));

  return null;
}

function PostWithUser() {
  const postWithUser = usePartValue(postDataWithUser);

  console.log(postWithUser.then((result) => console.log(result)));

  return null;
}

export default function App() {
  return (
    <Provider store={store}>
      <main>
        <h1>App</h1>

        <Post />
        <PostWithUser />
      </main>
    </Provider>
  );
}
