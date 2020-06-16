import { EventEmitter } from 'events';
import IORedis from 'ioredis';
import Job from './job';
import Timer from './timer';
import { DELAY_BUCKET_KEY, getReadyQueueKey, JOB_POOL_KEY, RETRY_LEVEL } from './helper';
import logger from './logger';

// 生产者仅能在单实例中运行
// 消费者通过生产者的 bpop 接口进行消费，可多实例，确认消费后需主动调用 finish
export default class JobManager extends EventEmitter {
  timer: Timer;
  redis: IORedis.Redis;
  blockRedis: IORedis.Redis;

  constructor() {
    super();
    this.timer = new Timer();
    this.redis = new IORedis();
    this.blockRedis = new IORedis();
  }

  // 新增延时消息
  public async push(topic: string, id: string, execAt?: number, delay?: number, data?: any) {
    if (execAt == null) {
      if (delay == null) delay = 0;
      execAt = Date.now() + delay;
    }

    const job = new Job(topic, id, execAt, data);
    await this._push(job);
  }

  public async finish(job: Job) {
    await this.remove(job);
  }

  public async remove(job: Job) {
    logger.debug('remove job:', job.toString());

    await this.redis.pipeline()
      .hdel(JOB_POOL_KEY, job.key())
      .zrem(DELAY_BUCKET_KEY, job.key())
      .exec();
  }

  // 阻塞弹出
  public async bpop<T = any>(topic: string): Promise<Job<T>> {
    const readyQueueKey = getReadyQueueKey(topic);
    const res = await this.blockRedis.blpop(readyQueueKey, 0);
    if (!res || !res.length) return null;
    const id = res[1];
    const job = await this.getJob(topic, id);
    await this.prepareRetry(job);
    return job;
  }

  // 非阻塞弹出
  public async pop<T = any>(topic: string): Promise<Job<T>> {
    const readyQueueKey = getReadyQueueKey(topic);
    const res = await this.redis.lpop(readyQueueKey);
    if (!res || !res.length) return null;
    const id = res[1];
    const job = await this.getJob(topic, id);
    await this.prepareRetry(job);
    return job;
  }

  // 生产者主循环，监测消息的到达并放入 ready queue 中
  public async start() {
    while (true) {
      const arrival = await this.getNearestTimer();
      await this.timer.waitTo(arrival);

      do {
        const res = await this.redis.zrangebyscore(DELAY_BUCKET_KEY, 0, Date.now(), 'LIMIT', 0, 1);
        if (!res || !res.length) break;

        const jobKey = res[0];
        const { topic, id } = Job.parseFromKey(jobKey);
        const readyQueueKey = getReadyQueueKey(topic);

        logger.debug('add job to ready queue', jobKey);

        await this.redis.pipeline()
          .zrem(DELAY_BUCKET_KEY, jobKey)
          .rpush(readyQueueKey, id)
          .exec();
      } while (true);

    }
  }

  // 为某一主题添加消费者
  // 如果调用此方法，则生产者和消费者在同一进程中，慎用
  // 传入的方法定义执行不报错消费成功，否则消费失败
  public async addConsumer<T = any>(topic: string, fn: (job: Job<T>) => Promise<void>) {
    while (true) {
      const job: Job<T> = await this.bpop(topic);
      if (!job) continue;

      try {
        await fn(job);
      } catch (err) {
        continue;
      }

      // 消费成功
      await this.finish(job);
    }
  }


  // 获取最近的任务执行时间，若不存在返回 null
  private async getNearestTimer() {
    const res = await this.redis.zrange(DELAY_BUCKET_KEY, 0, 0, 'WITHSCORES');
    if (!res || !res.length) return null;
    return Number(res[1]);
  }

  private async _push(job: Job) {
    logger.debug('_push job:', job.toString());

    await this.redis.pipeline()
      .hset(JOB_POOL_KEY, job.key(), job.toString())
      .zadd(DELAY_BUCKET_KEY, String(job.execAt), job.key())
      .exec();

    // 新增的消息有可能会更改计时器
    this.timer.notify(job.execAt);
  }

  private async getJob(topic: string, id: string) {
    const key = Job.getKey(topic, id);
    const val = await this.redis.hget(JOB_POOL_KEY, key);
    const job = Job.createFromStr(topic, id, val);
    return job;
  }

  // pop 后调用此方法
  // 重试机制：期望在未来某个地方主动调用 finish，否则会一直重试至重试上限
  private async prepareRetry(job: Job) {
    if (!RETRY_LEVEL[job.retry + 1]) return;

    job = job.copy();
    job.retry++;
    job.execAt = Date.now() + RETRY_LEVEL[job.retry];
    await this._push(job);
  }
}
