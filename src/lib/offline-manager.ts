import { Transaction } from './types';
import { ConflictResolver } from './data-sync-conflict-resolver';

export class OfflineManager {
  private queue: Transaction[] = [];
  private maxRetries: number = 3;
  private retryDelays: number[] = [1000, 2000, 5000]; // Exponential backoff

  constructor(maxRetries: number = 3) {
    this.maxRetries = maxRetries;
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
    this.queue.push({ ...transaction, retryCount: 0 });
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

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async syncWithRetry(transaction: Transaction): Promise<Transaction> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const serverData = await this.fetchServerData();
        const resolved = ConflictResolver.resolve(serverData[0], transaction);
        return resolved;
      } catch (error) {
        lastError = error;
        if (attempt < this.maxRetries - 1) {
          await this.delay(this.retryDelays[attempt]);
        }
      }
    }

    throw new Error(`Sync failed after ${this.maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  public async sync(): Promise<Transaction[]> {
    const failedTransactions: Transaction[] = [];
    const successfulTransactions: Transaction[] = [];

    for (const tx of this.queue) {
      try {
        const resolved = await this.syncWithRetry(tx);
        successfulTransactions.push(resolved);
      } catch (error) {
        failedTransactions.push(tx);
        console.error(`Failed to sync transaction ${tx.id}:`, error);
      }
    }

    // Update queue to only contain failed transactions
    this.queue = failedTransactions;
    this.saveQueue();

    return successfulTransactions;
  }
}