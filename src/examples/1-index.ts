import JobManager from '../manager';
import logger from '../logger';

// 生产者和消费者在同一进程中运行

const manager = new JobManager();
manager.start();

manager.addConsumer('test', async (job) => {
  logger.info('consuming test topic:', job.toString());
  await new Promise((resolve, reject) => {
    setTimeout(() => {
      const success = Math.random() > 0.5;
      logger.info('consumed test topic:', job.toString(), success ? 'success' : 'fail');
      if (success) return resolve();
      reject();
    }, 1);
  });
});

let id = 0;
setInterval(() => {
  id++;
  const delay = (id % 10) * 1000;
  manager.push('test', String(id), undefined, delay);
}, 5000);
