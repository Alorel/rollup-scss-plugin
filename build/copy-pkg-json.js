import * as fs from 'fs-extra';

export default function copyPkgJson(opts = {}) {
  const {
    pkgJsonPath = './package.json'
  } = opts;

  return {
    name: 'copy-pkg-json',
    generateBundle() {
      return fs.readFile('./package.json', 'utf8')
        .then(v => {
          const pkg = JSON.parse(v);
          delete pkg.devDependencies;
          delete pkg.scripts;

          this.emitFile({
            name: 'package.json',
            source: JSON.stringify(pkg, null, 2) + '\n',
            type: 'asset'
          })
        })
    }
  }
};
