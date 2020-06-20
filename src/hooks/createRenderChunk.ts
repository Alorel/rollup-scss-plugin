import MagicString from 'magic-string';
import type {RenderChunkHook} from 'rollup';
import type {Obj} from '../internal-types/Obj';
import type {Runtime} from '../runtime';

/** @internal */
export function createRenderChunk(
  baseUrl: string,
  emittedMetas: Obj<string>,
  runtime: Runtime
): RenderChunkHook {
  return function renderChunk(code) {
    const ms = new MagicString(code);
    let hasMatch = false;

    // Iterate through url imports, replace them with final URLs
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
  };
}
