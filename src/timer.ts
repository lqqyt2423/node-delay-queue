import logger from './logger';

// setTimeout max val
const MAX_INTERVAL = 2147483647;

export default class Timer {
  timer: NodeJS.Timeout;
  nextExecAt: number;
  pendingFn: () => void;

  constructor() {
    this.timer = null;
    this.nextExecAt = Date.now() + MAX_INTERVAL;
    this.pendingFn = null;
  }

  async waitTo(nextExecAt: number) {
    const now = Date.now();
    if (nextExecAt != null && nextExecAt <= now) return;

    if (nextExecAt == null) nextExecAt = now + MAX_INTERVAL;
    if (nextExecAt > now + MAX_INTERVAL) nextExecAt = now + MAX_INTERVAL;
    this.nextExecAt = nextExecAt;

    if (this.timer) clearTimeout(this.timer);
    if (this.pendingFn) this.pendingFn = null;
    const interval = nextExecAt - now;

    await new Promise(resolve => {
      this.pendingFn = resolve;
      this.timer = setTimeout(() => {
        this.finishWait(resolve);
      }, interval);
      logger.info('timer next interval:', interval);
    });
  }

  finishWait(resolve: () => void) {
    logger.info('timer finish wait');
    this.pendingFn = null;
    resolve();
  }

  notify(execAt: number) {
    // 未开始主循环或主循环当前不阻塞
    if (!this.pendingFn) return;

    // 新的消息执行时间在下次执行后面，不用管，直接返回
    if (execAt >= this.nextExecAt) return;

    logger.info('timer receive notify then retime');

    // 重设计时器
    const resolve = this.pendingFn;
    this.nextExecAt = execAt;
    if (this.timer) clearTimeout(this.timer);
    const interval = execAt - Date.now();

    if (interval <= 0) {
      return this.finishWait(resolve);
    }

    this.timer = setTimeout(() => {
      this.finishWait(resolve);
    }, interval);
    logger.info('timer next interval:', interval);
  }
}
