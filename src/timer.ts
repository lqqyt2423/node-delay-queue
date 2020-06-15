import logger from './logger';

// setTimeout max val
const MAX_INTERVAL = 2147483647;

export default class Timer {
  timer: NodeJS.Timeout; // 计时器
  arrival: number; // 计时到达点
  pendingFn: () => void; // 调用此方法解除阻塞

  constructor() {
    this.reset();
  }

  // 阻塞至时间点到达
  public async waitTo(arrival: number) {
    const now = Date.now();

    // 已经到达，不阻塞，直接返回
    if (arrival != null && arrival <= now) return;

    if (arrival == null) arrival = now + MAX_INTERVAL;
    if (arrival > now + MAX_INTERVAL) arrival = now + MAX_INTERVAL;
    this.arrival = arrival;

    // 重置
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.pendingFn) this.pendingFn = null;

    await new Promise(resolve => {
      this.pendingFn = resolve;
      const interval = this.arrival - now;
      this.timer = setTimeout(() => {
        this.finishWait();
      }, interval);
      logger.debug('timer next interval:', interval);
    });
  }

  // 通知修改内部阻塞计时器
  public notify(arrival: number) {
    // 当前不阻塞
    if (!this.pendingFn) return;

    // 在当前计时点之后，不做修改
    if (arrival >= this.arrival) return;

    logger.debug('timer new arrival', arrival);

    // 重置计时器
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.arrival = arrival;
    const interval = this.arrival - Date.now();
    if (interval <= 0) return this.finishWait();

    // 开始新的计时器
    this.timer = setTimeout(() => {
      this.finishWait();
    }, interval);
    logger.debug('timer new next interval:', interval);
  }

  private reset() {
    this.timer = null;
    this.arrival = Date.now() + MAX_INTERVAL;
    this.pendingFn = null;
  }

  // 结束阻塞
  private finishWait() {
    logger.debug('timer finish wait');
    const resolve = this.pendingFn;
    this.reset();
    resolve();
  }
}
