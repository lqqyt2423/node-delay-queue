function toPadStr(num: number, len: number) {
  const str = String(num);
  const diff = len - str.length;
  if (diff <= 0) return str;
  return '0'.repeat(diff) + str;
}

function getNowStr() {
  const now = new Date();

  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();

  return `${toPadStr(year, 4)}-${toPadStr(month, 2)}-${toPadStr(day, 2)} ${toPadStr(hour, 2)}:${toPadStr(minute, 2)}:${toPadStr(second, 2)}`;
}

// 传入环境变量 NODE_ENV=dev 或 NODE_ENV=development 开启 debug 日志
const isDev = process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'development';

class Logger {
  private _log(level: 'debug' | 'info' | 'warn' | 'error', message?: any, ...args: any[]) {
    if (message && typeof message === 'string') {
      console.log(`${getNowStr()} [${level}] ${message}`, ...args);
    } else {
      console.log(`${getNowStr()} [${level}]`, message, ...args);
    }
  }

  public debug(message?: any, ...args: any[]) {
    if (!isDev) return;
    this._log('debug', message, ...args);
  }

  public info(message?: any, ...args: any[]) {
    this._log('info', message, ...args);
  }

  public warn(message?: any, ...args: any[]) {
    this._log('warn', message, ...args);
  }

  public error(message?: any, ...args: any[]) {
    this._log('error', message, ...args);
  }
}

export const logger = new Logger();
