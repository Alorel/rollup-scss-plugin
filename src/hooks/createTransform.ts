import MagicString from 'magic-string';
import {basename, dirname, resolve} from 'path';
import type {TransformHook} from 'rollup';
import type {FileReader} from '../FileReader';
import type {FilterFn} from '../internal-types/FilterFn';
import type {Obj} from '../internal-types/Obj';
import type {Runtime} from '../runtime';

const regReplaceUrl = /url\(['"]?([a-zA-Z\d\-_/\.%]+)['"]?\)/g;

function returnNull(): null {
  return null;
}

/** @internal */
export function createTransform(
  filter: FilterFn,
  emittedMetas: Obj<string>,
  importReader: FileReader,
  runtime: Runtime
): TransformHook {
  return function transform(code, id) {
    if (!filter(id)) {
      return null;
    }

    const dir = dirname(id);
    const ops$: Promise<[number, number, string] | null>[] = [];

    // Replace url imports
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
  };
}
