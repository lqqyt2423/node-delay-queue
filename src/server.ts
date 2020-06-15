import express from 'express';
import Job from './job';
import JobManager from './manager';
import logger from './logger';

export default class Server {
  manager: JobManager;
  app: express.Express;

  constructor(manager: JobManager) {
    this.manager = manager;
    this.app = express();
    this.init();
  }

  public listen(port: number) {
    return this.app.listen(port, () => {
      logger.info('server start listen at', port);
    });
  }

  private init() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    this.app.post('/push', async (req, res) => {
      const { topic, id, data } = req.body;
      if (!topic || !id) return res.json({ code: 1, message: '参数错误' });

      let { execAt, delay } = req.body;
      if (execAt != null) execAt = parseInt(execAt) || null;
      if (delay != null) delay = parseInt(delay) || null;

      await this.manager.push(topic, id, execAt, delay, data);
      res.json({ code: 0 });
    });

    this.app.post('/pop', async (req, res) => {
      const { topic } = req.body;
      if (!topic) return res.json({ code: 1, message: '参数错误' });

      const job = await this.manager.pop(topic);
      if (!job) return res.json({ code: 0, data: null });
      res.json({ code: 0, data: job.toJSON() });
    });

    this.app.post('/bpop', async (req, res) => {
      const { topic } = req.body;
      if (!topic) return res.json({ code: 1, message: '参数错误' });

      // 超时时间无限制
      res.setTimeout(0);

      let job: Job;
      do {
        job = await this.manager.bpop(topic);
      } while (!job);
      res.json({ code: 0, data: job.toJSON() });
    });

    this.app.post('/remove', async (req, res) => {
      const { topic, id } = req.body;
      if (!topic || !id) return res.json({ code: 1, message: '参数错误' });

      const job = new Job(topic, id, 0);
      await this.manager.remove(job);
      res.json({ code: 0 });
    });

    this.app.post('/finish', async (req, res) => {
      const { topic, id } = req.body;
      if (!topic || !id) return res.json({ code: 1, message: '参数错误' });

      const job = new Job(topic, id, 0);
      await this.manager.finish(job);
      res.json({ code: 0 });
    });
  }
}
