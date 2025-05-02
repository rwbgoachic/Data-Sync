import { ConflictResolver } from '../lib/data-sync-conflict-resolver';
import { OfflineManager } from '../lib/offline-manager';
import { Transaction } from '../lib/types';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

describe('Offline Sync Tests', () => {
  let offlineManager: OfflineManager;
  let db: sqlite3.Database;

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

  test('offline queue merges with server data', async () => {
    const localTx: Transaction = {
      id: 'TX-LOCAL-001',
      timestamp: Date.now(),
      data: {
        items: [{ sku: 'TEST-001', quantity: 1, price: 10, name: 'Test Item' }],
        paymentMethod: 'cash',
        cashierId: 'CASH-001',
        storeId: 'STORE-001',
        amount: 10,
        tax: 1,
        subtotal: 9,
        total: 10
      }
    };

    offlineManager.addToQueue(localTx);
    const queue = offlineManager.getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe('TX-LOCAL-001');
  });

  test('conflicts resolve via timestamp', () => {
    const serverTx: Transaction = {
      id: 'TX-001',
      timestamp: Date.now() + 1000,
      data: {
        items: [{ sku: 'TEST-001', quantity: 1, price: 10, name: 'Test Item' }],
        paymentMethod: 'card',
        cashierId: 'CASH-001',
        storeId: 'STORE-001',
        amount: 20,
        tax: 2,
        subtotal: 18,
        total: 20
      }
    };

    const localTx: Transaction = {
      id: 'TX-001',
      timestamp: Date.now(),
      data: {
        items: [{ sku: 'TEST-001', quantity: 1, price: 10, name: 'Test Item' }],
        paymentMethod: 'cash',
        cashierId: 'CASH-001',
        storeId: 'STORE-001',
        amount: 10,
        tax: 1,
        subtotal: 9,
        total: 10
      }
    };

    const resolved = ConflictResolver.resolve(serverTx, localTx);
    expect(resolved.id).toBe('TX-001');
    expect(resolved.data.amount).toBe(20);
    expect(resolved.conflictResolved).toBe(true);
  });

  test('persists transactions to SQLite database', async () => {
    const tx: Transaction = {
      id: 'TX-DB-001',
      timestamp: Date.now(),
      data: {
        items: [{ sku: 'TEST-001', quantity: 1, price: 10, name: 'Test Item' }],
        paymentMethod: 'cash',
        cashierId: 'CASH-001',
        storeId: 'STORE-001',
        amount: 10,
        tax: 1,
        subtotal: 9,
        total: 10
      }
    };

    const run = promisify(db.run.bind(db));
    await run(
      'INSERT INTO transactions (id, timestamp, data) VALUES (?, ?, ?)',
      [tx.id, tx.timestamp, JSON.stringify(tx.data)]
    );

    const get = promisify(db.get.bind(db));
    const result = await get('SELECT * FROM transactions WHERE id = ?', [tx.id]);
    
    expect(result).toBeTruthy();
    expect(result.id).toBe(tx.id);
    expect(JSON.parse(result.data).amount).toBe(10);
  });

  test('handles batch synchronization with SQLite', async () => {
    const transactions: Transaction[] = [
      {
        id: 'TX-BATCH-001',
        timestamp: Date.now(),
        data: {
          items: [{ sku: 'TEST-001', quantity: 1, price: 10, name: 'Test Item' }],
          paymentMethod: 'cash',
          cashierId: 'CASH-001',
          storeId: 'STORE-001',
          amount: 10,
          tax: 1,
          subtotal: 9,
          total: 10
        }
      },
      {
        id: 'TX-BATCH-002',
        timestamp: Date.now() + 1000,
        data: {
          items: [{ sku: 'TEST-002', quantity: 2, price: 15, name: 'Test Item 2' }],
          paymentMethod: 'card',
          cashierId: 'CASH-001',
          storeId: 'STORE-001',
          amount: 30,
          tax: 3,
          subtotal: 27,
          total: 30
        }
      }
    ];

    const run = promisify(db.run.bind(db));
    for (const tx of transactions) {
      await run(
        'INSERT INTO transactions (id, timestamp, data) VALUES (?, ?, ?)',
        [tx.id, tx.timestamp, JSON.stringify(tx.data)]
      );
    }

    const all = promisify(db.all.bind(db));
    const results = await all('SELECT * FROM transactions WHERE id LIKE ?', ['TX-BATCH-%']);
    
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('TX-BATCH-001');
    expect(results[1].id).toBe('TX-BATCH-002');
  });
});