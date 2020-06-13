// 重试间隔，参考微信支付重试规则
// 通知频率为15s/15s/30s/3m/10m/20m/30m/30m/30m/60m/3h/3h/3h/6h/6h - 总计 24h4m
export const RETRY_LEVEL = [15000, 15000, 30000, 180000, 600000, 1200000, 1800000, 1800000, 1800000, 3600000, 10800000, 10800000, 10800000, 21600000, 21600000];


const REDIS_KEY_PREFIX = 'node_delay_queue:';


export const DELAY_BUCKET_KEY = REDIS_KEY_PREFIX + 'delay_bucket';


const READY_QUEUE_KEY_PREFIX = 'ready_queue:';
export function getReadyQueueKey(topic: string) {
  return REDIS_KEY_PREFIX + READY_QUEUE_KEY_PREFIX + topic;
}


const JOB_INFO_KEY_PREFIX = 'job_info:';
export function getJobInfoKey(key: string) {
  return REDIS_KEY_PREFIX + JOB_INFO_KEY_PREFIX + key;
}
