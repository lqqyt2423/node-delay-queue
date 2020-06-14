import JobProducer from './producer';
import JobConsumer from './consumer';
import logger from './logger';

const producer = new JobProducer();
producer.on('error', err => {
  logger.info('producer error:', err);
});
producer.loop();

const consumer = new JobConsumer('test', async job => {
  logger.info('consume job:', job.toString());
});
consumer.on('error', err => {
  logger.info('consumer error:', err);
});
// consumer.loop();

consumer.bpop('test').then(job => {
  logger.info('bpop test 1', job);
});
consumer.bpop('test').then(job => {
  logger.info('bpop test 2', job);
});

let id = 0;
setInterval(() => {
  id++;
  producer.push('test', String(id), undefined, 500);
}, 5000);



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
