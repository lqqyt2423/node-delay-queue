import IORedis from 'ioredis';
import { Job, JobManager } from './job';
import { getReadyQueueKey, getJobInfoKey, RETRY_LEVEL } from './helper';

// 消费者
export default class JobConsumer extends JobManager {
  topic: string;
  consumRedis: IORedis.Redis;

  // 消费者方法，定义执行不报错消费成功，否则消费失败
  consumFn: (job: Job) => Promise<any>;

  constructor(topic: string, fn: (job: Job) => Promise<any>) {
    super();
    this.topic = topic;
    this.consumFn = fn;

    // 用单独的 redis 连接进行消费者
    this.consumRedis = new IORedis();
  }

  // 主循环：不断消费
  async loop() {
    while(true) {
      const job = await this.bpop(this.topic);
      if (!job) continue;

      try {
        await this.consumFn(job);
      } catch (err) {
        continue;
      }

      // 消费成功后调用
      await this.finish(job);
    }
  }

  // 非阻塞弹出
  async pop(topic: string) {
    const readyQueueKey = getReadyQueueKey(topic);
    const id = await this.consumRedis.lpop(readyQueueKey);
    if (!id) return null;
    return await this._pop(topic, id);
  }

  // 阻塞弹出
  async bpop(topic: string) {
    const readyQueueKey = getReadyQueueKey(topic);
    const res = await this.consumRedis.blpop(readyQueueKey, 0);
    if (!res || !res.length) return null;
    const id = res[1];
    return await this._pop(topic, id);
  }

  async _pop(topic: string, id: string) {
    const key = Job.getKey(topic, id);
    const val = await this.redis.get(getJobInfoKey(key));
    const job = Job.createFromStr(topic, id, val);

    // 重试机制：期望在未来某个地方主动调用 finish，否则会一直重试下去
    if (RETRY_LEVEL[job.retry + 1]) {
      const nextJob = job.copy();
      nextJob.retry++;
      nextJob.execAt = Date.now() + RETRY_LEVEL[nextJob.retry];
      await this._push(nextJob);
    }

    return job;
  }
}
