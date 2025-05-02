import { Transaction } from './types';
import { ConflictResolver } from './data-sync-conflict-resolver';

export class OfflineManager {
  private queue: Transaction[] = [];

  constructor() {
    // Initialize queue from storage if available
    this.loadQueue();
  }

  private loadQueue(): void {
    const stored = localStorage.getItem('tx_queue');
    if (stored) {
      this.queue = JSON.parse(stored);
    }
  }

  private saveQueue(): void {
    localStorage.setItem('tx_queue', JSON.stringify(this.queue));
  }

  public addToQueue(transaction: Transaction): void {
    this.queue.push(transaction);
    this.saveQueue();
  }

  public getQueue(): Transaction[] {
    return [...this.queue];
  }

  public clearQueue(): void {
    this.queue = [];
    this.saveQueue();
  }

  private async fetchServerData(): Promise<Transaction[]> {
    // Implementation would depend on your API structure
    throw new Error('fetchServerData must be implemented');
  }

  public async sync(): Promise<Transaction[]> {
    const resolved = ConflictResolver.resolve(await this.fetchServerData(), this.getQueue());
    this.clearQueue();
    return resolved;
  }
}