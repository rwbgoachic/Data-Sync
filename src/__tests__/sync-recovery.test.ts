import { SyncRecovery } from '../lib/sync-recovery';
import { Transaction } from '../lib/types';
import sqlite3 from 'sqlite3';

describe('Sync Recovery', () => {
  let syncRecovery: SyncRecovery;

  beforeEach(() => {
    syncRecovery = new SyncRecovery(':memory:');
  });

  afterEach(async () => {
    await syncRecovery.close();
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

  test('logs failed sync', async () => {
    const error = new Error('Network error');
    await syncRecovery.logFailedSync(sampleTransaction, error);
    
    const failedSyncs = await syncRecovery.getFailedSyncs();
    expect(failedSyncs).toHaveLength(1);
    expect(failedSyncs[0].id).toBe(sampleTransaction.id);
    expect(failedSyncs[0].error).toBe(error.message);
  });

  test('retrieves failed syncs', async () => {
    const error = new Error('Test error');
    await syncRecovery.logFailedSync(sampleTransaction, error);
    
    const failedSyncs = await syncRecovery.getFailedSyncs();
    expect(failedSyncs[0].retryCount).toBe(0);
    expect(failedSyncs[0].data.amount).toBe(sampleTransaction.data.amount);
  });

  test('cleans up old failed syncs', async () => {
    const oldTransaction: Transaction = {
      ...sampleTransaction,
      id: 'OLD-TX',
      timestamp: Date.now() - (31 * 24 * 60 * 60 * 1000) // 31 days old
    };

    await syncRecovery.logFailedSync(oldTransaction, new Error('Old error'));
    await syncRecovery.logFailedSync(sampleTransaction, new Error('New error'));
    
    const deletedCount = await syncRecovery.cleanup(30);
    expect(deletedCount).toBe(1);
    
    const remainingSyncs = await syncRecovery.getFailedSyncs();
    expect(remainingSyncs).toHaveLength(1);
    expect(remainingSyncs[0].id).toBe(sampleTransaction.id);
  });
});