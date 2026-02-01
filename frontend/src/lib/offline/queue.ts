import { OfflineAction, QueueStatus } from './types';

class OfflineQueueService {
  private queue: OfflineAction[] = [];
  private isProcessing = false;

  async addAction(type: OfflineAction['type'], payload: Record<string, unknown>): Promise<string> {
    const action: OfflineAction = {
      id: crypto.randomUUID(),
      type,
      payload,
      createdAt: Date.now(),
      status: 'pending',
      retryCount: 0,
    };

    this.queue.push(action);
    this.processQueue();
    return action.id;
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    // Process pending actions
    for (const action of this.queue.filter(a => a.status === 'pending')) {
      try {
        action.status = 'processing';
        // Mock processing - in real implementation, this would sync to server
        await new Promise(resolve => setTimeout(resolve, 100));
        action.status = 'completed';
      } catch (error) {
        action.status = 'failed';
        action.lastError = error instanceof Error ? error.message : 'Unknown error';
        action.retryCount++;
      }
    }

    this.isProcessing = false;
  }

  getStatus(): QueueStatus {
    const pending = this.queue.filter(a => a.status === 'pending').length;
    const failed = this.queue.filter(a => a.status === 'failed').length;
    const lastSync = this.queue.length > 0 ? Math.max(...this.queue.map(a => a.createdAt)) : null;

    return {
      pending,
      failed,
      lastSync,
    };
  }

  clearCompleted(): void {
    this.queue = this.queue.filter(a => a.status !== 'completed');
  }
}

export const offlineQueueService = new OfflineQueueService();