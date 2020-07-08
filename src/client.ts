import { EventEmitter } from 'events';
import axios from 'axios';
import { logger } from './logger';

interface Job<T = any> {
  topic: string;
  id: string;
  execAt: number;
  retry: number;
  data?: T;
}

export class Client extends EventEmitter {
  endpoint: string;

  constructor(endpoint: string) {
    super();
    this.endpoint = endpoint;
  }

  private getApi(api: string) {
    return this.endpoint + api;
  }

  private async request(api: string, payload?: any): Promise<any> {
    const res = await axios.post(this.getApi(api), payload, { responseType: 'json' });
    if (res.status !== 200) throw new Error(String(res.status));
    const data = res.data;
    if (!data || data.code == null) throw new Error('no data responsed');
    if (data.code !== 0) throw new Error(data.message || String(data.code));

    return data.data;
  }

  public async push<T = any>(payload: {
    topic: string;
    id: string;
    execAt?: number;
    delay?: number;
    data?: T;
  }) {
    logger.debug('client push job: %s', payload);
    return await this.request('/push', payload);
  }

  public async pop<T = any>(payload: { topic: string }): Promise<Job<T>> {
    return await this.request('/pop', payload);
  }

  public async bpop<T = any>(payload: { topic: string }): Promise<Job<T>> {
    return await this.request('/bpop', payload);
  }

  public async remove(payload: { topic: string, id: string }) {
    return await this.request('/remove', payload);
  }

  public async finish(payload: { topic: string, id: string }) {
    return await this.request('/finish', payload);
  }

  // 为某一主题添加消费者
  // 传入的方法定义执行不报错消费成功，否则消费失败
  public async addConsumer<T = any>(topic: string, fn: (job: Job<T>) => Promise<void>) {
    while (true) {
      const job: Job<T> = await this.bpop({ topic });
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

  // 并行消费
  public async addParallelConsumer<T = any>(topic: string, paralle: number, fn: (job: Job<T>) => Promise<void>) {
    if (paralle < 1) paralle = 1;

    let count = 0;
    let trigger: () => void;

    while (true) {
      const job: Job<T> = await this.bpop({ topic });

      count++;
      fn(job).then(() => { return this.finish(job); }).catch().then(() => {
        count--;
        if (trigger && count < paralle) {
          logger.debug('release block');
          trigger();
          trigger = null;
        }
      });

      if (count < paralle) continue;

      logger.debug('begin block');
      await new Promise(resolve => {
        trigger = resolve;
      });
    }
  }
}
