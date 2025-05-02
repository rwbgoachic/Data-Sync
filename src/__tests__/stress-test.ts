import { ConflictResolver } from '../lib/data-sync-conflict-resolver';
import { OfflineManager } from '../lib/offline-manager';
import { Transaction } from '../lib/types';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

describe('Stress Testing - Offline Sync', () => {
  let offlineManager: OfflineManager;
  let db: sqlite3.Database;
  const TRANSACTION_COUNT = 500;
  const CONFLICT_RATE = 0.1; // 10% conflict rate

  beforeAll(async () => {
    db = new sqlite3.Database(':memory:');
    const run = promisify(db.run.bind(db));
    await run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        timestamp INTEGER,
        data TEXT
      )
    `);
  });

  beforeEach(() => {
    offlineManager = new OfflineManager();
  });

  afterAll((done) => {
    db.close(done);
  });

  const generateTransaction = (id: string, timestamp: number): Transaction => ({
    id,
    timestamp,
    data: {
      items: [
        {
          sku: `ITEM-${Math.floor(Math.random() * 1000)}`,
          quantity: Math.floor(Math.random() * 10) + 1,
          price: Math.random() * 100,
          name: `Test Item ${id}`
        }
      ],
      paymentMethod: Math.random() > 0.5 ? 'card' : 'cash',
      cashierId: `CASH-${Math.floor(Math.random() * 10)}`,
      storeId: `STORE-${Math.floor(Math.random() * 5)}`,
      amount: Math.random() * 1000,
      tax: Math.random() * 100,
      subtotal: Math.random() * 900,
      total: Math.random() * 1000,
      customerInfo: {
        id: `CUST-${Math.floor(Math.random() * 1000)}`,
        name: `Customer ${id}`,
        email: `customer${id}@example.com`
      },
      discounts: Math.random() > 0.7 ? [{
        code: `DISC-${Math.floor(Math.random() * 100)}`,
        amount: Math.random() * 50,
        type: Math.random() > 0.5 ? 'percentage' : 'fixed'
      }] : undefined
    }
  });

  test('handles large batch of transactions with conflicts', async () => {
    const localTransactions: Transaction[] = [];
    const remoteTransactions: Transaction[] = [];
    
    // Generate transactions
    for (let i = 0; i < TRANSACTION_COUNT; i++) {
      const baseTimestamp = Date.now() - Math.floor(Math.random() * 86400000); // Random time within last 24h
      const id = `TX-${i.toString().padStart(6, '0')}`;
      
      // Add to local transactions
      localTransactions.push(generateTransaction(id, baseTimestamp));
      
      // Add to remote with conflict probability
      if (Math.random() < CONFLICT_RATE) {
        remoteTransactions.push(generateTransaction(id, baseTimestamp + 1000)); // 1 second newer
      }
    }

    const startTime = performance.now();
    const resolved = ConflictResolver.resolveBatch(localTransactions, remoteTransactions);
    const endTime = performance.now();

    expect(resolved.length).toBeGreaterThanOrEqual(TRANSACTION_COUNT);
    expect(resolved.every(tx => tx.conflictResolved)).toBe(true);
    
    console.log(`Resolution time: ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`Conflicts handled: ${remoteTransactions.length}`);
  });

  test('persists large batch to SQLite efficiently', async () => {
    const transactions: Transaction[] = Array.from({ length: TRANSACTION_COUNT }, (_, i) => 
      generateTransaction(`TX-BATCH-${i.toString().padStart(6, '0')}`, Date.now() + i)
    );

    const startTime = performance.now();
    const run = promisify(db.run.bind(db));
    
    // Use transaction for bulk insert
    await run('BEGIN TRANSACTION');
    
    try {
      for (const tx of transactions) {
        await run(
          'INSERT INTO transactions (id, timestamp, data) VALUES (?, ?, ?)',
          [tx.id, tx.timestamp, JSON.stringify(tx.data)]
        );
      }
      await run('COMMIT');
    } catch (error) {
      await run('ROLLBACK');
      throw error;
    }
    
    const endTime = performance.now();

    const all = promisify(db.all.bind(db));
    const results = await all('SELECT COUNT(*) as count FROM transactions');
    
    expect(results[0].count).toBe(TRANSACTION_COUNT);
    console.log(`Database insertion time: ${(endTime - startTime).toFixed(2)}ms`);
  });

  test('handles concurrent operations under load', async () => {
    const transactions = Array.from({ length: 100 }, (_, i) => 
      generateTransaction(`TX-CONCURRENT-${i}`, Date.now() + i)
    );

    const startTime = performance.now();
    
    // Simulate concurrent operations
    await Promise.all(transactions.map(tx => {
      return new Promise<void>(async (resolve) => {
        const run = promisify(db.run.bind(db));
        await run(
          'INSERT INTO transactions (id, timestamp, data) VALUES (?, ?, ?)',
          [tx.id, tx.timestamp, JSON.stringify(tx.data)]
        );
        resolve();
      });
    }));

    const endTime = performance.now();

    const all = promisify(db.all.bind(db));
    const results = await all('SELECT COUNT(*) as count FROM transactions WHERE id LIKE ?', ['TX-CONCURRENT-%']);
    
    expect(results[0].count).toBe(100);
    console.log(`Concurrent operations time: ${(endTime - startTime).toFixed(2)}ms`);
  });
});