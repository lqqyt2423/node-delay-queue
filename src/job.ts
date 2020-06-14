import { EventEmitter } from 'events';
import IORedis from 'ioredis';
import { DELAY_BUCKET_KEY, getReadyQueueKey, getJobInfoKey } from './helper';

export class Job {
  topic: string;
  id: string;
  execAt: number; // 执行时间戳，毫秒
  retry: number; // 当前重试次数，初始化时为 -1
  data?: any; // 任务私有数据

  constructor(topic: string, id: string, execAt: number, data?: any, retry?: number) {
    this.topic = topic;
    this.id = id;
    this.execAt = execAt;
    this.data = data;
    this.retry = retry == null ? -1 : retry;
  }

  static createFromStr(topic: string, id: string, str: string) {
    try {
      const obj = JSON.parse(str);
      return new Job(topic, id, obj.execAt || 0, obj.data, obj.retry);
    } catch (err) {
      return new Job(topic, id, 0);
    }
  }

  static parseFromKey(key: string) {
    const [topic, id] = key.split('_');
    return { topic, id };
  }

  // 需要保证 topic 和 id 中不应该出现 _ 字符，否则会解析出错
  // todo: 优化
  static getKey(topic: string, id: string) {
    return topic + '_' + id;
  }

  // topic 和 id 共同组成 redis 中 key
  key() { return Job.getKey(this.topic, this.id); }

  toString() {
    return JSON.stringify(this.toJSON());
  }

  toJSON() {
    return {
      topic: this.topic,
      id: this.id,
      execAt: this.execAt,
      retry: this.retry,
    };
  }

  copy() {
    return new Job(this.topic, this.id, this.execAt, this.data, this.retry);
  }
}


export class JobManager extends EventEmitter {
  redis: IORedis.Redis;

  constructor() {
    super();
    this.redis = new IORedis();
  }

  // 获取最近的任务执行时间，若不存在返回 null
  async getNearestTimer() {
    const res = await this.redis.zrange(DELAY_BUCKET_KEY, 0, 0, 'WITHSCORES');
    if (!res || !res.length) return null;
    return Number(res[1]);
  }

  // 将已到达的任务添加至 ready queue
  async jobToReady() {
    do {
      const res = await this.redis.zrangebyscore(DELAY_BUCKET_KEY, 0, Date.now(), 'LIMIT', 0, 1);
      if (!res || !res.length) return;

      const jobKey = res[0];
      await this.redis.zrem(DELAY_BUCKET_KEY, jobKey);

      const { topic, id } = Job.parseFromKey(jobKey);
      const readyQueueKey = getReadyQueueKey(topic);
      await this.redis.rpush(readyQueueKey, id);
    } while (true);
  }

  async _push(job: Job) {
    await this.redis.set(getJobInfoKey(job.key()), job.toString());
    await this.redis.zadd(DELAY_BUCKET_KEY, job.execAt, job.key());
  }

  async finish(job: Job) {
    await this.redis.del(getJobInfoKey(job.key()));
    await this.redis.zrem(DELAY_BUCKET_KEY, job.key());
  }
}
