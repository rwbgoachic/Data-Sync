import { OfflineManager } from '../lib/offline-manager';
import { Transaction } from '../lib/types';

describe('OfflineManager with Retry Logic', () => {
  let offlineManager: OfflineManager;

  beforeEach(() => {
    offlineManager = new OfflineManager(3);
    localStorage.clear();
  });

  const sampleTransaction: Transaction = {
    id: 'TEST-TX-001',
    timestamp: Date.now(),
    data: {
      items: [{ sku: 'ITEM-001', quantity: 1, price: 10, name: 'Test Item' }],
      paymentMethod: 'cash',
      cashierId: 'CASH-001',
      storeId: 'STORE-001',
      amount: 10,
      tax: 1,
      subtotal: 9,
      total: 10
    }
  };

  test('adds transaction to queue with retry count', () => {
    offlineManager.addToQueue(sampleTransaction);
    const queue = offlineManager.getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].retryCount).toBe(0);
  });

  test('persists queue to localStorage', () => {
    offlineManager.addToQueue(sampleTransaction);
    const storedQueue = JSON.parse(localStorage.getItem('tx_queue') || '[]');
    expect(storedQueue).toHaveLength(1);
    expect(storedQueue[0].id).toBe(sampleTransaction.id);
  });

  test('clears queue', () => {
    offlineManager.addToQueue(sampleTransaction);
    offlineManager.clearQueue();
    expect(offlineManager.getQueue()).toHaveLength(0);
    expect(localStorage.getItem('tx_queue')).toBe('[]');
  });

  test('handles multiple transactions in queue', () => {
    const tx1 = { ...sampleTransaction, id: 'TX-1' };
    const tx2 = { ...sampleTransaction, id: 'TX-2' };
    
    offlineManager.addToQueue(tx1);
    offlineManager.addToQueue(tx2);
    
    expect(offlineManager.getQueue()).toHaveLength(2);
  });

  test('maintains transaction order in queue', () => {
    const tx1 = { ...sampleTransaction, id: 'TX-1' };
    const tx2 = { ...sampleTransaction, id: 'TX-2' };
    
    offlineManager.addToQueue(tx1);
    offlineManager.addToQueue(tx2);
    
    const queue = offlineManager.getQueue();
    expect(queue[0].id).toBe('TX-1');
    expect(queue[1].id).toBe('TX-2');
  });
});