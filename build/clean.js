const del = require('del');

export default function cleanPlugin(opts = {}) {
  const {
    dir = './dist'
  } = opts;

  let cleaned = false;

  return {
    name: 'clean',
    buildStart() {
      if (!cleaned) {
        cleaned = true;

        return del(dir);
      }
    }
  }
}
