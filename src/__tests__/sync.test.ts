import { ConflictResolver } from '../lib/data-sync-conflict-resolver';
import { Transaction } from '../lib/types';

describe('Transaction Synchronization', () => {
  const baseTransaction: Transaction = {
    id: 'TX-2024-001',
    timestamp: Date.now(),
    data: {
      items: [
        { sku: 'ITEM-001', quantity: 2, price: 25.00, name: 'Premium Widget' },
        { sku: 'ITEM-002', quantity: 1, price: 15.50, name: 'Basic Widget' }
      ],
      paymentMethod: 'card',
      cashierId: 'CASH-001',
      storeId: 'STORE-NYC-001',
      amount: 65.50,
      tax: 5.50,
      subtotal: 60.00,
      total: 65.50,
      customerInfo: {
        id: 'CUST-001',
        name: 'John Doe',
        email: 'john@example.com'
      },
      discounts: [
        {
          code: 'SPRING10',
          amount: 10,
          type: 'percentage'
        }
      ]
    }
  };

  test('handles complex transaction data with customer info and discounts', () => {
    const serverTx = { ...baseTransaction, timestamp: Date.now() + 1000 };
    const localTx = { ...baseTransaction, timestamp: Date.now() };
    
    const resolved = ConflictResolver.resolve(serverTx, localTx);
    
    expect(resolved).toEqual({
      ...serverTx,
      conflictResolved: true
    });
    expect(resolved.data.customerInfo).toBeDefined();
    expect(resolved.data.discounts).toHaveLength(1);
  });

  test('preserves discount information during conflict resolution', () => {
    const localTx = {
      ...baseTransaction,
      data: {
        ...baseTransaction.data,
        discounts: [
          {
            code: 'SUMMER20',
            amount: 20,
            type: 'percentage'
          }
        ]
      }
    };
    
    const serverTx = {
      ...baseTransaction,
      timestamp: Date.now() + 2000
    };
    
    const resolved = ConflictResolver.resolve(serverTx, localTx);
    expect(resolved.data.discounts).toBeDefined();
    expect(resolved.conflictResolved).toBe(true);
  });

  test('batch resolution maintains customer information integrity', () => {
    const localTxs = [
      {
        ...baseTransaction,
        id: 'TX-001',
        data: {
          ...baseTransaction.data,
          customerInfo: {
            id: 'CUST-002',
            name: 'Jane Smith',
            email: 'jane@example.com'
          }
        }
      },
      {
        ...baseTransaction,
        id: 'TX-002',
        timestamp: Date.now() + 1000
      }
    ];

    const remoteTxs = [
      {
        ...baseTransaction,
        id: 'TX-001',
        timestamp: Date.now() + 2000
      },
      {
        ...baseTransaction,
        id: 'TX-003',
        data: {
          ...baseTransaction.data,
          customerInfo: {
            id: 'CUST-003',
            name: 'Bob Wilson',
            email: 'bob@example.com'
          }
        }
      }
    ];

    const resolved = ConflictResolver.resolveBatch(localTxs, remoteTxs);
    
    expect(resolved).toHaveLength(3);
    expect(resolved.every(tx => tx.conflictResolved)).toBe(true);
    expect(resolved.every(tx => tx.data.customerInfo)).toBe(true);
  });

  test('manual override preserves complex data structure', () => {
    const originalTx = { ...baseTransaction };
    const override = {
      data: {
        amount: 75.00,
        tax: 6.25,
        subtotal: 68.75,
        total: 75.00,
        customerInfo: {
          id: 'CUST-004',
          name: 'Alice Johnson',
          email: 'alice@example.com'
        }
      }
    };

    const overridden = ConflictResolver.manualOverride(originalTx, override);
    
    expect(overridden.data.amount).toBe(75.00);
    expect(overridden.data.customerInfo?.name).toBe('Alice Johnson');
    expect(overridden.data.items).toEqual(baseTransaction.data.items);
    expect(overridden.conflictResolved).toBe(true);
  });
});