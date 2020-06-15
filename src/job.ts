export default class Job {
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
    if (!str) return new Job(topic, id, 0);

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
      data: this.data,
    };
  }

  copy() {
    return new Job(this.topic, this.id, this.execAt, this.data, this.retry);
  }
}
