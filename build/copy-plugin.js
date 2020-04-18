import * as fs from 'fs-extra';

function loadFile(name, ctx) {
  return fs.readFile(name)
    .then(
      source => {
        ctx.emitFile({
          name,
          source,
          type: 'asset'
        })
      },
      e => {
        ctx.warn({
          message: e.message,
          stack: e.stack
        })
      }
    );
}

export default function copy(opts = {}) {
  const {
    files = []
  } = opts;

  if (!files.length) {
    throw new Error('No files provided');
  }

  return {
    name: 'copy-plugin',
    generateBundle() {
      return Promise.all(files.map(f => loadFile(f, this)));
    }
  }
}
