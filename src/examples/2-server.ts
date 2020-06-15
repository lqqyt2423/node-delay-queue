import JobManager from '../manager';
import Server from '../server';

// 延时队列服务端，仅能开一个实例，与客户端通过 http api 沟通

const manager = new JobManager();
manager.start();
new Server(manager).listen(8000);
