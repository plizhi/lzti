/**
 * 极简日志器：带时间戳和级别，方便在 pm2 日志里定位连接级问题。
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

function currentLevel() {
  const raw = (process.env.LOG_LEVEL || 'info').toLowerCase();
  return LEVELS[raw] ?? LEVELS.info;
}

function stamp() {
  return new Date().toISOString();
}

function emit(level, scope, args) {
  if (LEVELS[level] < currentLevel()) return;
  const prefix = `[${stamp()}] [${level.toUpperCase()}] [${scope}]`;
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(prefix, ...args);
}

export function createLogger(scope) {
  return {
    debug: (...args) => emit('debug', scope, args),
    info: (...args) => emit('info', scope, args),
    warn: (...args) => emit('warn', scope, args),
    error: (...args) => emit('error', scope, args),
  };
}
