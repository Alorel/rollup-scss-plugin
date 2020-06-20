import type {LoadHook} from 'rollup';
import type {FilterFn} from '../internal-types/FilterFn';
import type {Runtime} from '../runtime';

/** @internal */
export function createLoad(filter: FilterFn, runtime: Runtime): LoadHook {
  return function load(id) {
    return filter(id) ? runtime.load(id, this) : null;
  };
}
