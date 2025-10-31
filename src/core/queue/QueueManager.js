/**
 * Queue Manager - Background job processing
 * @module core/queue/QueueManager
 */

import EventEmitter from 'events';
import Logger from '../logging/Logger.js';

export class QueueManager extends EventEmitter {
  constructor() {
    super();
    if (QueueManager.instance) {
      return QueueManager.instance;
    }

    this.queues = new Map();
    this.workers = new Map();
    this.processing = false;

    QueueManager.instance = this;
  }

  createQueue(name, concurrency = 1) {
    this.queues.set(name, []);
    this.workers.set(name, { concurrency, active: 0 });
  }

  async add(queueName, job) {
    if (!this.queues.has(queueName)) {
      this.createQueue(queueName);
    }

    const jobId = Date.now() + Math.random();
    this.queues.get(queueName).push({ id: jobId, ...job, status: 'pending' });

    this.emit('job:added', { queueName, jobId });
    this.processQueue(queueName);

    return jobId;
  }

  async processQueue(queueName) {
    const queue = this.queues.get(queueName);
    const worker = this.workers.get(queueName);

    if (!queue || worker.active >= worker.concurrency) {
      return;
    }

    const job = queue.find(j => j.status === 'pending');
    if (!job) return;

    job.status = 'processing';
    worker.active++;

    try {
      await job.handler(job.data);
      job.status = 'completed';
      this.emit('job:completed', { queueName, jobId: job.id });
    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      this.emit('job:failed', { queueName, jobId: job.id, error });
      Logger.error(`Job ${job.id} failed`, error);
    } finally {
      worker.active--;
      this.processQueue(queueName);
    }
  }

  getQueueStatus(queueName) {
    const queue = this.queues.get(queueName) || [];
    return {
      pending: queue.filter(j => j.status === 'pending').length,
      processing: queue.filter(j => j.status === 'processing').length,
      completed: queue.filter(j => j.status === 'completed').length,
      failed: queue.filter(j => j.status === 'failed').length
    };
  }
}

export default new QueueManager();
