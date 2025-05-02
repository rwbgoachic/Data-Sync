import { ConflictResolver } from './lib/data-sync-conflict-resolver';
import { Transaction } from './lib/types';

// Example usage
const serverTransaction: Transaction = {
  id: '1',
  timestamp: Date.now(),
  data: {
    amount: 100,
    items: [{
      sku: 'ITEM001',
      quantity: 2,
      price: 25,
      name: 'Widget'
    }],
    paymentMethod: 'card',
    cashierId: 'CASH001',
    storeId: 'STORE001',
    tax: 10,
    subtotal: 90,
    total: 100
  }
};

const localTransaction: Transaction = {
  id: '1',
  timestamp: Date.now() - 1000, // 1 second older
  data: {
    amount: 200,
    items: [{
      sku: 'ITEM001',
      quantity: 2,
      price: 25,
      name: 'Widget'
    }],
    paymentMethod: 'cash',
    cashierId: 'CASH001',
    storeId: 'STORE001',
    tax: 20,
    subtotal: 180,
    total: 200
  }
};

const resolvedTransaction = ConflictResolver.resolve(serverTransaction, localTransaction);
console.log('Resolved transaction:', resolvedTransaction);

// Example of manual override
const overriddenTransaction = ConflictResolver.manualOverride(resolvedTransaction, {
  data: { 
    amount: 150,
    tax: 15,
    subtotal: 135,
    total: 150
  }
});
console.log('Overridden transaction:', overriddenTransaction);