import {createFilter, FilterPattern} from '@rollup/pluginutils';
import MagicString from 'magic-string';
import * as sass from 'node-sass';
import {basename, dirname, resolve} from 'path';
import {Plugin, PluginContext, TransformPluginContext} from 'rollup';
import {FileReader} from './FileReader';
import {Runtime} from './runtime';

//tslint:disable:no-invalid-this

export interface RollupSassOptions {
  baseUrl?: string;

  exclude?: FilterPattern;

  include?: FilterPattern;

  sassOpts?: Omit<sass.Options, 'file' | 'data' | 'omitSourceMapUrl'>;
}

export interface RollupSassHookImportables {
  [id: string]: string[] | null;
}

export interface RollupSassHook extends Omit<Plugin, 'name'> {
  importedBy: RollupSassHookImportables;

  imports: RollupSassHookImportables;

  name: 'rollup-plugin-scss';
}

export function sassPlugin(opts?: RollupSassOptions): RollupSassHook {
  const {
    baseUrl = '/',
    include = /\.s[ac]ss$/,
    exclude,
    sassOpts = {}
  } = opts || {};

  const filter = createFilter(include, exclude);

  const runtime = new Runtime(sassOpts);
  const emittedMetas: { [k: string]: string } = {};
  const importReader = new FileReader();

  return {
    importedBy: runtime.importedBy,
    imports: runtime.imports,
    load(id) {
      if (!filter(id)) {
        return null;
      }

      return runtime.load(id, this);
    },
    name: 'rollup-plugin-scss',
    transform(this: TransformPluginContext, code, id) {
      if (!filter(id)) {
        return null;
      }

      const dir = dirname(id);
      const ops$: Promise<[number, number, string] | null>[] = [];

      code.replace(regReplaceUrl, (fullMatch: string, match: string, idx: number): any => {
        const resolved = resolve(dir, match);

        ops$.push(
          importReader.load(resolved)
            .then<[number, number, string]>(source => {
              const assetId = this.emitFile({
                name: basename(resolved),
                source,
                type: 'asset'
              });
              const metaImport = `import.meta.ROLLUP_FILE_URL_${assetId}`;
              emittedMetas[metaImport] = assetId;

              return [idx, idx + fullMatch.length, `url(${metaImport})`];
            })
            .catch(returnNull)
        );
      });

      if (!ops$.length) {
        return null;
      }

      return Promise.all(ops$)
        .then(ops => {
          const ms = new MagicString(code);
          for (const op of ops) {
            if (op) {
              ms.overwrite.apply(ms, op);
            }
          }

          return {
            code: ms.toString(),
            map: runtime.mapsEnabled ? ms.generateMap({hires: true}) : {mappings: ''}
          };
        });
    },
    renderChunk(this: PluginContext, code) {
      const ms = new MagicString(code);
      let hasMatch = false;

      for (const [search, id] of Object.entries(emittedMetas)) {
        let idx = 0;
        do {
          idx = code.indexOf(search, idx);
          if (idx === -1) {
            break;
          }
          ms.overwrite(idx, idx + search.length, baseUrl + this.getFileName(id));
          hasMatch = true;
          idx++;
        } while (true);
      }

      if (hasMatch) {
        return {
          code: ms.toString(),
          map: runtime.mapsEnabled ? ms.generateMap({hires: true}) : {mappings: ''}
        };
      }

      return null;
    },
    watchChange(id) {
      runtime.invalidate(id);
      importReader.invalidate(id);
      if (runtime.importedBy[id]) {
        for (const importer of runtime.importedBy[id]!) {
          runtime.invalidate(importer);
        }
      }
    }
  };
}

function returnNull(): null {
  return null;
}

const regReplaceUrl = /url\(['"]?([a-zA-Z\d\-_/\.%]+)['"]?\)/g;
