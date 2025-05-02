import merge from 'lodash.merge';
import { Transaction } from './types';

export class ConflictResolver {
  /**
   * Resolves conflicts between server and local transactions based on timestamp
   */
  static resolve(serverTx: Transaction, localTx: Transaction): Transaction {
    if (serverTx.timestamp > localTx.timestamp) {
      console.warn(`Conflict detected: Using server version for transaction ${serverTx.id}`);
      return { ...serverTx, conflictResolved: true };
    } else {
      console.warn(`Conflict detected: Using local version for transaction ${localTx.id}`);
      return { ...localTx, conflictResolved: true };
    }
  }

  /**
   * Resolves conflicts between multiple local and remote transactions
   */
  static resolveBatch(local: Transaction[], remote: Transaction[]): Transaction[] {
    const merged = [...remote];
    const processedIds = new Set(remote.map(tx => tx.id));

    local.forEach(localTx => {
      if (processedIds.has(localTx.id)) {
        const remoteTx = remote.find(r => r.id === localTx.id)!;
        const resolvedTx = this.resolve(remoteTx, localTx);
        const index = merged.findIndex(tx => tx.id === localTx.id);
        merged[index] = resolvedTx;
      } else {
        merged.push({ ...localTx, conflictResolved: true });
      }
    });

    return merged;
  }

  /**
   * Manually override specific fields in a transaction
   */
  static manualOverride(finalTx: Transaction, manualData: Partial<Transaction>): Transaction {
    console.warn(`Manual override applied to transaction ${finalTx.id}`);
    return merge({}, finalTx, manualData, { conflictResolved: true });
  }
}