import express from 'express';
import { Client } from '../';
import { logger } from '../logger';


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.post('/notify', (req, res) => {
  logger.info('receive notify:', JSON.stringify(req.body));
  res.end('ok');
});
app.listen(9000);

const client = new Client('http://localhost:8000');

// 定时产生消息
let id = 0;
setInterval(() => {
  id++;
  const delay = (id % 10) * 1000;
  client.push({
    topic: 'http_call',
    id: String(id),
    delay,
    data: {
      notifyurl: 'http://localhost:9000/notify',
      data: { a: 'b' },
    },
  });
}, 10000);
