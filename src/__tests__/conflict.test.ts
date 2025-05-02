import { ConflictResolver } from '../lib/data-sync-conflict-resolver';
import { Transaction } from '../lib/types';

describe('ConflictResolver', () => {
  const baseTxData = {
    items: [{ sku: 'DEF456', quantity: 1, price: 10, name: 'Test Item' }],
    paymentMethod: 'cash' as const,
    cashierId: 'CASH_DUMMY',
    storeId: 'STORE_DUMMY',
    amount: 10,
    tax: 1,
    subtotal: 9,
    total: 10
  };

  const sampleTransaction: Transaction = {
    id: 'POS-2024-001',
    timestamp: Date.now(),
    data: baseTxData
  };

  test('resolves in favor of server when server timestamp is newer', () => {
    const serverTx = { ...sampleTransaction, timestamp: 1620000000000 };
    const localTx = { ...sampleTransaction, timestamp: 1619999999999 };
    const resolved = ConflictResolver.resolve(serverTx, localTx);
    expect(resolved).toEqual({
      ...serverTx,
      conflictResolved: true
    });
  });

  test('resolves in favor of local when local timestamp is newer', () => {
    const serverTx = { ...sampleTransaction, timestamp: 1619999999999 };
    const localTx = { ...sampleTransaction, timestamp: 1620000000000 };
    const resolved = ConflictResolver.resolve(serverTx, localTx);
    expect(resolved).toEqual({
      ...localTx,
      conflictResolved: true
    });
  });

  test('manual override applies specified changes', () => {
    const originalTx = { ...sampleTransaction };
    const override = {
      data: {
        amount: 15,
        tax: 1.5,
        subtotal: 13.5,
        total: 15
      }
    };
    const overridden = ConflictResolver.manualOverride(originalTx, override);
    expect(overridden).toEqual({
      ...originalTx,
      ...override,
      conflictResolved: true
    });
  });

  test('batch resolution handles multiple transactions', () => {
    const localTxs = [
      { ...sampleTransaction, id: '1', timestamp: 1620000000000 },
      { ...sampleTransaction, id: '2', timestamp: 1619999999999 }
    ];
    const remoteTxs = [
      { ...sampleTransaction, id: '1', timestamp: 1619999999999 },
      { ...sampleTransaction, id: '3', timestamp: 1620000000000 }
    ];
    
    const resolved = ConflictResolver.resolveBatch(localTxs, remoteTxs);
    
    expect(resolved).toHaveLength(3);
    expect(resolved).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: '1',
          data: expect.objectContaining({ total: 10 }),
          conflictResolved: true
        }),
        expect.objectContaining({
          id: '2',
          conflictResolved: true
        }),
        expect.objectContaining({
          id: '3',
          conflictResolved: true
        })
      ])
    );
  });
});