import { part } from '../../src';

export const primitivePart = part('primitive', 'value');
export const composedPart = part('composed', [primitivePart]);
export const uppercasePart = part([primitivePart], (primitive) =>
  primitive.toUpperCase()
);
export const uppercaseAsyncPart = part([primitivePart], async (primitive) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return primitive.toUpperCase();
});
