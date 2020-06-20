import type {RollupSassHookImportables} from '../index';

/**
 * Filter the given imports object to no longer have the given import
 * @param obj Object to check
 * @param checkId ID to check
 * @param removeId ID to remove
 * @internal
 */
export function filterNoLongerImports(obj: RollupSassHookImportables, checkId: string, removeId: string): void {
  const array = obj[checkId];
  if (array) {
    const removeIdx = array.indexOf(removeId);
    if (removeIdx !== -1) {
      if (array.length > 1) {
        array.splice(removeIdx, 1);
      } else {
        obj[checkId] = null;
      }
    }
  }
}
