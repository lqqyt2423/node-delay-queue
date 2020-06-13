function toPadStr(num: number, len: number) {
  const str = String(num);
  const diff = len - str.length;
  if (diff <= 0) return str;
  return '0'.repeat(diff) + str;
}

function getNowStr() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();

  return `${toPadStr(hour, 2)}:${toPadStr(minute, 2)}:${toPadStr(second, 2)}`;
}

const logger = {
  info(...args: any[]) {
    console.log(getNowStr(), ...args);
  }
};

export default logger;
