import { Client } from '../';
import { logger } from '../logger';

// 延时队列客户端，可开多个实例，与服务端通过 http api 沟通

const client = new Client('http://localhost:8000');

// 消息到达时调用
client.addConsumer('test', async job => {
  logger.info('client consume job:', JSON.stringify(job));
});

// 定时产生消息
let id = 0;
setInterval(() => {
  id++;
  const delay = (id % 10) * 1000;
  client.push({
    topic: 'test',
    id: String(id),
    delay,
  });
}, 1000);
