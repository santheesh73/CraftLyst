// Minimal glob matching for ignore lists and config globs: **, *, ?, {a,b}, character classes.

/** @type {Map<string, RegExp>} */
const cache = new Map();

/**
 * Convert a glob to a RegExp matching POSIX-style relative paths.
 * A pattern without "/" matches at any depth (gitignore semantics).
 * @param {string} glob
 * @returns {RegExp}
 */
export function globToRegExp(glob) {
  const hit = cache.get(glob);
  if (hit) return hit;
  let g = glob.replace(/^\.\//, '');
  const anchored = g.startsWith('/') || g.replace(/\/$/, '').includes('/');
  g = g.replace(/^\//, '');
  let re = '';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*') {
      if (g[i + 1] === '*') {
        const slashAfter = g[i + 2] === '/';
        re += slashAfter ? '(?:.*/)?' : '.*';
        i += slashAfter ? 2 : 1;
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') re += '[^/]';
    else if (c === '{') {
      const end = g.indexOf('}', i);
      if (end < 0) re += '\\{';
      else {
        re += '(?:' + g.slice(i + 1, end).split(',').map((s) => s.replace(/[.+^$()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')).join('|') + ')';
        i = end;
      }
    } else if (c === '[') {
      const end = g.indexOf(']', i);
      if (end < 0) re += '\\[';
      else {
        re += '[' + g.slice(i + 1, end).replace(/^!/, '^') + ']';
        i = end;
      }
    } else re += c.replace(/[.+^$()|\\]/g, '\\$&');
  }
  if (re.endsWith('/')) re = re.slice(0, -1);
  const result = new RegExp(`^${anchored ? '' : '(?:.*/)?'}${re}(?:/.*)?$`);
  cache.set(glob, result);
  return result;
}

/**
 * @param {string} path POSIX relative path
 * @param {string[]} globs
 */
export function matchesAny(path, globs) {
  return globs.some((g) => globToRegExp(g).test(path));
}
