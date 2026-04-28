// @ts-check
/**
 * Mutation Handlers
 * Connects mutation types to actual data operations
 * These handlers are executed during sync to apply mutations
 */

import db from './db';
import { savePantryState } from '../core/appState';

/**
 * Handler for ADD_ITEM mutations
 */
export async function handleAddItem(mutation: any): Promise<any> {
  const { payload } = mutation;

  try {
    // Add to pantry in IndexedDB
    const item = {
      name: payload.name.toLowerCase().trim(),
      quantity: parseFloat(payload.quantity) || 1,
      unit: payload.unit || 'item',
      category: payload.category || 'other',
      purchaseDate: payload.purchaseDate || new Date().toISOString(),
      expiryDate: payload.expiryDate || null,
    };

    await (db as any).add('pantry', item);

    // Refresh state
    const pantry = await db.getPantry();
    await savePantryState(pantry);

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Handler for UPDATE_ITEM mutations
 */
export async function handleUpdateItem(mutation: any): Promise<any> {
  const { payload } = mutation;

  try {
    const existing = await db.get('pantry', payload.id);
    if (!existing) {
      return { success: false, error: 'Item not found' };
    }

    const updated = {
      ...existing,
      ...payload.updates,
      id: payload.id, // Preserve ID
    };

    await db.put('pantry', updated);

    // Refresh state
    const pantry = await db.getPantry();
    await savePantryState(pantry);

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Handler for DELETE_ITEM mutations
 */
export async function handleDeleteItem(mutation: any): Promise<any> {
  const { payload } = mutation;

  try {
    await db.delete('pantry', payload.id);

    // Refresh state
    const pantry = await db.getPantry();
    await savePantryState(pantry);

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Register all handlers with sync processor
 */
export function registerAllHandlers(syncProcessor: any): void {
  syncProcessor.registerHandler('ADD_ITEM', handleAddItem);
  syncProcessor.registerHandler('UPDATE_ITEM', handleUpdateItem);
  syncProcessor.registerHandler('DELETE_ITEM', handleDeleteItem);

  console.log('[MutationHandlers] All handlers registered');
}
