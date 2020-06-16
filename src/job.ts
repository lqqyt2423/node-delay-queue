// 需确保不会和 topic 和 id 里包含的字符冲突
const SPLIT_STR = '&#_#&';

export class Job<T = any> {
  topic: string;
  id: string;
  execAt: number; // 执行时间戳，毫秒
  retry: number; // 当前重试次数，初始化时为 -1
  data?: T; // 任务私有数据

  constructor(topic: string, id: string, execAt: number, data?: T, retry?: number) {
    this.topic = topic;
    this.id = id;
    this.execAt = execAt;
    this.data = data;
    this.retry = retry == null ? -1 : retry;
  }

  static createFromStr<T = any>(topic: string, id: string, str: string): Job<T> {
    if (!str) return new Job(topic, id, 0);

    try {
      const obj = JSON.parse(str);
      return new Job(topic, id, obj.execAt || 0, obj.data, obj.retry);
    } catch (err) {
      return new Job(topic, id, 0);
    }
  }

  static parseFromKey(key: string) {
    const [topic, id] = key.split(SPLIT_STR);
    return { topic, id };
  }

  static getKey(topic: string, id: string) {
    return topic + SPLIT_STR + id;
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
      data: this.data,
    };
  }

  copy() {
    return new Job(this.topic, this.id, this.execAt, this.data, this.retry);
  }
}
