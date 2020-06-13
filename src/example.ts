import JobProducer from './producer';
import JobConsumer from './consumer';
import logger from './logger';

const producer = new JobProducer();
producer.on('error', err => {
  logger.info('producer error:', err);
});
producer.loop();

const consumer = new JobConsumer('test', async job => {
  const fail = Math.random() > 0.5;
  logger.info('consume job:', job.toString(), 'fail:', fail);
  if (fail) throw new Error('fail');
});
consumer.on('error', err => {
  logger.info('consumer error:', err);
});
consumer.loop();

let id = 0;
setInterval(() => {
  id++;
  producer.push('test', String(id), undefined, 500);
}, 1000);

process.on('unhandledRejection', (reason, promise) => {
  logger.info('unhandledRejection reason:', reason);
  logger.info('unhandledRejection promise:', promise);
});

setInterval(() => {
  const mem = process.memoryUsage();
  const format = function (bytes: number) {
    return (bytes / 1024 / 1024).toFixed(2) + 'MB';
  };
  logger.info('Process: heapTotal ' + format(mem.heapTotal) + ' heapUsed ' + format(mem.heapUsed) + ' rss ' + format(mem.rss));
}, 2000);

logger.info('pid:', process.pid);
