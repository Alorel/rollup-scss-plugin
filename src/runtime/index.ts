import {BoundClass, BoundMethod} from '@aloreljs/bound-decorator';
import * as sass from 'node-sass';
import type {LoadResult, PluginContext, SourceDescription} from 'rollup';
import {promisify} from 'util';
import type {RollupSassHookImportables, RollupSassOptions} from '../index';
import {filterNoLongerImports} from './filterNoLongerImports';
import {postprocessForWindows} from './postprocessForWindows';

const render = promisify(sass.render);

interface CompileResult {
  imports: string[];

  rollupResponse: LoadResult;
}

/** @internal */
@BoundClass()
export class Runtime {
  /** Keys are module IDs, values are modules that import them */
  public readonly importedBy: RollupSassHookImportables = {};

  /** Keys are module IDs, values are modules they import */
  public readonly imports: RollupSassHookImportables = {};

  /** Whether sourcemaps are enabled or not */
  public mapsEnabled = false;

  private readonly compileCache: { [id: string]: CompileResult | null } = {};

  public constructor(private readonly sassOpts?: RollupSassOptions['sassOpts']) {
  }

  public invalidate(id: string): void {
    if (this.compileCache[id]) {
      this.compileCache[id] = null;
    }
    if (this.importedBy[id]) {
      for (const importer of this.importedBy[id]!) {
        this.invalidate(importer);
      }

      this.importedBy[id] = null;
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
      .then<LoadResult>(result => {
        for (const removedId of this.getRemovedImports(id, result.imports)) {
          this.noLongerImports(id, removedId);
        }

        if (result.imports.length) {
          this.processCompiledImports(id, ctx, result.imports);
          this.imports[id] = result.imports;
        } else if (this.imports[id]) {
          this.imports[id] = null;
        }

        return result.rollupResponse;
      });
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
    filterNoLongerImports(this.imports, importingId, importedId);
    filterNoLongerImports(this.importedBy, importedId, importingId);
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

  @BoundMethod()
  private toCompileResult(result: sass.Result): CompileResult {
    const code = result.css.toString('utf8');
    const map: SourceDescription['map'] = result.map ? JSON.parse(result.map.toString('utf8')) : null;
    postprocessForWindows(result);
    this.mapsEnabled = !!map;
    const imports = result.stats.includedFiles
      .filter(f => f !== result.stats.entry);

    return this.compileCache[result.stats.entry] = {
      imports,
      rollupResponse: map ? {code, map} : code
    };
  }
}
