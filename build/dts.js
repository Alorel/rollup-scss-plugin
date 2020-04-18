const xSpawn = require('cross-spawn');

export default function dts() {
  return {
    name: 'generate-dts',
    generateBundle() {
      return new Promise((resolve, reject) => {
        const proc = xSpawn('tsc', ['--declaration', '--emitDeclarationOnly'], {
          stdio: 'ignore'
        });
        let errored = false;
        proc
          .once('error', e => {
            errored = e;
          })
          .once('exit', code => {
            if (code !== 0 || errored) {
              reject(errored || new Error(`Exited with code ${code}`));
            } else {
              resolve();
            }
          })
      })
    }
  }
}
