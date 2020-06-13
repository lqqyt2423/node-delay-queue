import { Job, JobManager } from './job';
import Timer from './timer';

// 生产者
export default class JobProducer extends JobManager {
  timer: Timer;

  constructor() {
    super();
    this.timer = new Timer();
  }

  // 主循环：检测消息的到达并存入消费队列中
  async loop() {
    while (true) {
      const nextExecAt = await this.getNearestTimer();
      await this.timer.waitTo(nextExecAt);
      await this.jobToReady();
    }
  }

  // 新增延时消息
  async push(topic: string, id: string, execAt?: number, delay?: number, data?: any) {
    if (!execAt) {
      if (!delay) delay = 0;
      execAt = Date.now() + delay;
    }

    const job = new Job(topic, id, execAt, data);
    await this._push(job);

    // 新增的消息有可能会更改计时器
    this.timer.notify(execAt);
  }
}
