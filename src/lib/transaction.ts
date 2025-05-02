export interface TransactionItem {
  sku: string;
  quantity: number;
  price: number;
  name: string;
}

export interface Transaction {
  id: string;
  timestamp: number;
  data: {
    amount: number;
    items: TransactionItem[];
    paymentMethod: 'card' | 'cash' | 'mobile';
    cashierId: string;
    storeId: string;
    subtotal?: number;
    tax?: number;
    total?: number;
  };
  conflictResolved?: boolean;
}