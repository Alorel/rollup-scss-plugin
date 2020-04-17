import {createFilter, FilterPattern} from '@rollup/pluginutils';
import * as sass from 'node-sass';
import {Plugin} from 'rollup';
import {Runtime} from './runtime';

//tslint:disable:no-invalid-this

export interface RollupSassOptions {
  exclude?: FilterPattern;

  include?: FilterPattern;

  sassOpts?: Omit<sass.Options, 'file' | 'data' | 'omitSourceMapUrl'>;
}

export interface RollupSassHook extends Omit<Plugin, 'name'> {
  imports: {
    [id: string]: string[] | null;
  };

  name: 'rollup-plugin-scss';
}

export function sassPlugin(opts?: RollupSassOptions): RollupSassHook {
  const {
    include = ['*.scss', '*.sass'],
    exclude,
    sassOpts = {}
  } = opts || {};

  const filter = createFilter(include, exclude);

  const runtime = new Runtime(sassOpts);

  return {
    imports: runtime.imports,
    load(id) {
      if (!filter(id)) {
        return null;
      }

      return runtime.load(id, this);
    },
    name: 'rollup-plugin-scss',
    watchChange(id) {
      runtime.invalidate(id);
      if (runtime.importedBy[id]) {
        for (const importer of runtime.importedBy[id]!) {
          runtime.invalidate(importer);
        }
      }
    }
  };
}
