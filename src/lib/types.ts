export interface Transaction {
  id: string;
  timestamp: number;
  conflictResolved?: boolean;
  data: {
    amount: number;
    items: Array<{
      sku: string;
      quantity: number;
      price: number;
      name: string;
    }>;
    paymentMethod: 'card' | 'cash' | 'mobile';
    cashierId: string;
    storeId: string;
    customerInfo?: {
      id?: string;
      name?: string;
      email?: string;
    };
    discounts?: Array<{
      code: string;
      amount: number;
      type: 'percentage' | 'fixed';
    }>;
    subtotal?: number;
    tax?: number;
    total?: number;
  };
}