import JobManager from '../manager';
import Server from '../server';
import axios from 'axios';

// 生产者和消费者在同一进程
// topic: http_call
// 自定义规则：当任务到达时主动发送 http post 请求至 job 中的 notifyurl，返回 200 成功，否则失败
// 类似于微信支付成功后的主动回调，包含错误重试功能

interface HTTPJob {
  notifyurl: string;
  data?: any;
}

const manager = new JobManager();
manager.start();
new Server(manager).listen(8000);

// 监测 http_call 主题中的任务时间到达
manager.addConsumer('http_call', async job => {
  const data = job.data as HTTPJob;

  // 解析，解析失败直接丢弃此消息
  if (!data || !data.notifyurl) return;
  if (!data.notifyurl.startsWith('http')) return;

  const payload = { topic: job.topic, id: job.id, ...data.data };
  const res = await axios.post(data.notifyurl, payload);
  if (res.status !== 200) throw new Error(String(res.status));
});

// 客户端通过 push HTTPJob 类型的数据与之交互
