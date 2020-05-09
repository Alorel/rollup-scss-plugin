import {promises as fs} from 'fs';

/** @internal */
export class FileReader {
  private readonly cache: { [path: string]: Promise<Buffer> | null } = {};

  public invalidate(path: string): void {
    if (path in this.cache) {
      this.cache[path] = null;
    }
  }

  public load(path: string): Promise<Buffer> {
    if (!this.cache[path]) {
      this.cache[path] = fs.readFile(path);
    }

    return this.cache[path]!;
  }
}
