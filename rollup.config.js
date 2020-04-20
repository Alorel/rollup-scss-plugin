import typescript from '@rollup/plugin-typescript';
import {join} from 'path';
import {dependencies, peerDependencies} from './package.json';
import {cleanPlugin} from '@alorel/rollup-plugin-clean';
import {copyPkgJsonPlugin as copyPkgJson} from '@alorel/rollup-plugin-copy-pkg-json';
import {dtsPlugin as dts} from '@alorel/rollup-plugin-dts';
import {copyPlugin as cpPlugin} from '@alorel/rollup-plugin-copy';

function mkOutput(overrides = {}) {
  return {
    dir: join(__dirname, 'dist'),
    assetFileNames: '[name][extname]',
    sourcemap: false,
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
        copyPkgJson({
          unsetPaths: ['devDependencies', 'scripts']
        }),
        dts()
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
    cleanPlugin({
      dir: join(__dirname, 'dist')
    }),
    typescript({
      tsconfig: join(__dirname, 'tsconfig.json')
    }),
    cpPlugin({
      defaultOpts: {
        glob: {
          cwd: __dirname
        },
        emitNameKind: 'fileName'
      },
      copy: [
        'LICENSE',
        'CHANGELOG.md',
        'README.md'
      ]
    })
  ]
}
