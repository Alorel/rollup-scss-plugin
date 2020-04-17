import typescript from '@rollup/plugin-typescript';
import {join} from 'path';
import {dependencies, peerDependencies} from './package.json';
import cleanPlugin from './build/clean';
import copyPkgJson from './build/copy-pkg-json';
import dts from './build/dts';
import cpPlugin from './build/copy-plugin';

function mkOutput(overrides = {}) {
  return {
    dir: join(__dirname, 'dist'),
    assetFileNames: '[name][extname]',
    sourcemap: true,
    ...overrides
  };
}

export default {
  input: join(__dirname, 'src', 'index.ts'),
  external: Array.from(
    new Set(
      Object.keys(dependencies)
        .concat(Object.keys(peerDependencies))
        .concat('util', 'fs', 'path')
    )
  ),
  output: [
    mkOutput({
      entryFileNames: '[name].cjs.js',
      format: 'cjs',
      plugins: [
        copyPkgJson(),
        dts(),
        cpPlugin({
          files: [
            'LICENSE',
            'CHANGELOG.md',
            'README.md'
          ]
        })
      ]
    }),
    mkOutput({
      entryFileNames: '[name].es.js',
      format: 'esm'
    })
  ],
  watch: {
    exclude: 'node_modules/*'
  },
  plugins: [
    cleanPlugin(),
    typescript({
      tsconfig: join(__dirname, 'tsconfig.json')
    })
  ]
}
