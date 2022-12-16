import ESLintWebpackPlugin from 'eslint-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import path from 'path';
import webpack from 'webpack';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

export default {
  devtool: 'source-map',

  entry: [path.resolve(ROOT, 'DEV_ONLY', 'index.tsx')],

  mode: 'development',

  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        include: [path.resolve(ROOT, 'src'), /DEV_ONLY/],
        loader: 'ts-loader',
        options: {
          configFile: path.resolve(ROOT, 'build', 'tsconfig', 'base.json'),
          reportFiles: ['src/*.{ts|tsx}'],
        },
        test: /\.tsx?$/,
      },
    ],
  },

  output: {
    filename: 'react-redux-partitioner.js',
    library: 'Style',
    libraryTarget: 'umd',
    path: path.resolve(ROOT, 'dist'),
    umdNamedDefine: true,
  },

  plugins: [
    new webpack.EnvironmentPlugin(['NODE_ENV']),
    new HtmlWebpackPlugin(),
    new ESLintWebpackPlugin(),
  ],

  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
};
