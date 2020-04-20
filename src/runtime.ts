import * as sass from 'node-sass';
import {LoadResult, PluginContext, SourceDescription} from 'rollup';
import {promisify} from 'util';
import {RollupSassHookImportables, RollupSassOptions} from './index';

const render = promisify(sass.render);

// Sass replaces backslashes with forward slashes
const isWindows = process.platform === 'win32';
const formatWindowsPath: (id: string) => string = (() => {
  const reg = /\//g;

  return (id: string) => id.replace(reg, '\\');
})();

interface CompileResult {
  imports: string[];

  rollupResponse: LoadResult;
}

/** @internal */
export class Runtime {
  /** Keys are module IDs, values are modules that import them */
  public readonly importedBy: RollupSassHookImportables = {};

  /** Keys are module IDs, values are modules they import */
  public readonly imports: RollupSassHookImportables = {};

  private readonly compileCache: { [id: string]: CompileResult | null } = {};

  public constructor(private readonly sassOpts?: RollupSassOptions['sassOpts']) {
    this.toCompileResult = this.toCompileResult.bind(this);
  }

  public invalidate(id: string): void {
    if (this.compileCache[id]) {
      this.compileCache[id] = null;
    }
  }

  public load(id: string, ctx: PluginContext): LoadResult | Promise<LoadResult> {
    if (this.compileCache[id]) {
      return this.compileCache[id]!.rollupResponse;
    }

    return this.compile(id, ctx);
  }

  private compile(id: string, ctx: PluginContext): Promise<LoadResult> {
    const renderOpts: sass.Options = {
      sourceMap: true,
      sourceMapEmbed: false,
      ...this.sassOpts,
      data: undefined,
      file: id,
      omitSourceMapUrl: true,
      outFile: __filename
    };

    return render(renderOpts)
      .then(this.toCompileResult) //tslint:disable-line:no-unbound-method
      .then((result: CompileResult): LoadResult => {
        for (const removedId of this.getRemovedImports(id, result.imports)) {
          this.noLongerImports(id, removedId);
        }

        if (result.imports.length) {
          this.processCompiledImports(id, ctx, result.imports);
          this.imports[id] = result.imports;
        } else {
          this.imports[id] = null;
        }

        return result.rollupResponse;
      });
  }

  private filterNoLongerImports(objName: 'imports' | 'importedBy', checkId: string, removeId: string): void {
    const obj = this[objName];
    if (obj[checkId]) {
      const filtered = obj[checkId]!.filter(i => i !== removeId);
      obj[checkId] = filtered.length ? filtered : null;
    }
  }

  private getRemovedImports(id: string, newImports: string[]): string[] {
    const oldImports = this.imports[id];
    if (oldImports) {
      if (!newImports.length) {
        return oldImports;
      }
      const out = oldImports.filter(i => !newImports.includes(i));
      if (out.length) {
        return out;
      }
    }

    return [];
  }

  private noLongerImports(importingId: string, importedId: string): void {
    this.filterNoLongerImports('imports', importingId, importedId);
    this.filterNoLongerImports('importedBy', importedId, importingId);
  }

  private processCompiledImports(id: string, ctx: PluginContext, imports: string[]): void {
    for (const imp of imports) {
      const importedBy: string[] = this.importedBy[imp] || (this.importedBy[imp] = []);
      if (!importedBy.includes(id)) {
        importedBy.push(id);
      }
      ctx.addWatchFile(imp);
    }
  }

  private toCompileResult(result: sass.Result): CompileResult {
    const code = result.css.toString('utf8');
    const map: SourceDescription['map'] = result.map ? JSON.parse(result.map.toString('utf8')) : null;
    if (isWindows) {
      result.stats.entry = formatWindowsPath(result.stats.entry);
      result.stats.includedFiles = result.stats.includedFiles.map(formatWindowsPath);
    }
    const imports = result.stats.includedFiles
      .filter(f => f !== result.stats.entry);

    return this.compileCache[result.stats.entry] = {
      imports,
      rollupResponse: map ? {code, map} : code
    };
  }
}
