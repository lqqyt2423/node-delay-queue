# node-delay-queue

基于 Redis 实现的延迟队列，基本逻辑参考[有赞延迟队列设计](https://tech.youzan.com/queuing_delay/)实现，代码和接口实现参考 [delay-queue](https://github.com/ouqiang/delay-queue)。

任务重试规则参考微信支付主动回调：
> 通知频率为15s/15s/30s/3m/10m/20m/30m/30m/30m/60m/3h/3h/3h/6h/6h - 总计 24h4m

## 实现原理

任务元信息和私有数据放入 hash 中。任务执行时间和任务 id 放入 zset，主循环不断监测时间到达的任务，然后rpush 至 list 中供消费者消费，消费时通过 blpop 消费，消费完成需主动调用 finish 方法，否则会不断重试，重试规则见上面。

本项目一个优化点是：监测任务时间到达的计时器，不是采用定时监测。而是在每次循环开始先计算最近到达任务的时间间隔，然后根据此间隔设置定时器。

## 项目启动

先启动延时队列服务端，可参考 `src/examples/2-server.ts`。然后客户端通过 http api 的方式与服务端交互。客户端可参考 `src/examples/2-client.ts` 实现。

## HTTP 接口

- 请求方法均为 POST
- 请求和返回数据结构均为 json

可用接口，可参考文件 `src/server.ts`：
- /push
- /pop
- /bpop
- /remove
- /finish

客户端调用可参考文件 `src/client.ts`

## 数据结构定义

```typescript
interface Job {
  topic: string; // 主题
  id: string; // id
  execAt: number; // 执行时间戳，毫秒
  retry: number; // 当前重试次数，初始化时为 -1
  data?: any; // 任务私有数据
}
```

topic 和 id 合起来唯一即可。
