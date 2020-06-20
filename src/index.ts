import {createFilter, FilterPattern} from '@rollup/pluginutils';
import * as sass from 'node-sass';
import type {Plugin} from 'rollup';
import {FileReader} from './FileReader';
import {createLoad} from './hooks/createLoad';
import {createRenderChunk} from './hooks/createRenderChunk';
import {createTransform} from './hooks/createTransform';
import {createWatchChange} from './hooks/createWatchChange';
import type {Obj} from './internal-types/Obj';
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
  const emittedMetas: Obj<string> = {};
  const importReader = new FileReader();

  return {
    importedBy: runtime.importedBy,
    imports: runtime.imports,
    load: createLoad(filter, runtime),
    name: 'rollup-plugin-scss',
    renderChunk: createRenderChunk(baseUrl, emittedMetas, runtime),
    transform: createTransform(filter, emittedMetas, importReader, runtime),
    watchChange: createWatchChange(runtime, importReader)
  };
}
