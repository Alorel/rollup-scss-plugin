require('source-map-support/register');
import {sassPlugin} from './dist/esm/index';
import {join} from 'path';
import MagicString from 'magic-string';

export default {
  input: join(__dirname, 'test-scss2.scss'),
  output: {
    dir: join(__dirname, 'dist', 'tmp'),
    sourcemap: true,
    format: 'esm',
    entryFileNames: '[name].js',

  },
  plugins: [
    sassPlugin(),
    {
      name: 'tmppluggie',
      transform(code) {
        const ms = new MagicString(code);
        ms.overwrite(0, code.length, `export default ${JSON.stringify(code)};`);

        const orig = {
          code,
          map: this.getCombinedSourcemap()
        };
        debugger;

        return {
          code: ms.toString(),
          map: ms.generateMap({hires: true})
        };
      }
    }
  ]
}
