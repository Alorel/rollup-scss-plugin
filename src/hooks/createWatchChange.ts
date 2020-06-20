import type {PluginHooks} from 'rollup';
import type {FileReader} from '../FileReader';
import type {Runtime} from '../runtime';

/** @internal */
export function createWatchChange(runtime: Runtime, importReader: FileReader): PluginHooks['watchChange'] {
  return function watchChange(id) {
    runtime.invalidate(id);
    importReader.invalidate(id);
  };
}
