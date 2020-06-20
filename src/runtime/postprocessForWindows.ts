import type {Result} from 'node-sass';

/**
 * Sass replaces backslashes with forward slashes. This fixes that.
 * @internal
 */
let postprocessForWindows: (result: Result) => void;

if (process.platform === 'win32') {
  const reg = /\//g;

  function formatWindowsPath(id: string): string {
    return id.replace(reg, '\\');
  }

  postprocessForWindows = function (result: Result): void {
    result.stats.entry = formatWindowsPath(result.stats.entry);
    result.stats.includedFiles = result.stats.includedFiles.map(formatWindowsPath);
  };
} else {
  postprocessForWindows = () => { //tslint:disable-line:no-empty
  };
}

// @internal
export {postprocessForWindows};
