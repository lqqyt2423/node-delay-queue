import { Job } from './job';
import assert from 'assert';

describe('job.ts', () => {
  it('should JSON.stringify', async () => {
    const job = new Job('test', '1', Date.now(), Buffer.from('a'));
    const str = JSON.stringify(job);
    assert(str);
  });
});
