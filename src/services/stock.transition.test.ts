import { describe, expect, it, vi } from 'vitest'
import {
  STOCK_CONFLICT_MESSAGE,
  STOCK_DELETE_BLOCKED_MESSAGE,
  STOCK_PROMO_BLOCKED_MESSAGE,
  canChangeStockState,
  canToggleStockPromo,
  deleteStockItem,
  isStockItemSoldOrLinked,
  resolveStockMutationErrorMessage,
  runStockStateTransitionGuard,
} from './stock'
import type { StockItem } from '../types'

function buildItem(partial: Partial<StockItem>): Pick<StockItem, 'state' | 'status' | 'sale_id'> {
  return {
    state: partial.state ?? 'new',
    status: partial.status ?? 'available',
    sale_id: partial.sale_id ?? null,
  }
}

describe('stock sold transition guard', () => {
  it('Case 1: marks sold item as locked for state changes', () => {
    const soldItem = buildItem({ state: 'sold', status: 'sold' })
    expect(isStockItemSoldOrLinked(soldItem)).toBe(true)
    expect(canChangeStockState(soldItem, 'new')).toBe(false)
  })

  it('Case 2: blocks manual state change and does not call request', () => {
    const soldLinkedItem = buildItem({ state: 'sold', status: 'sold', sale_id: 'sale-123' })
    const requestSpy = vi.fn()

    const result = runStockStateTransitionGuard(soldLinkedItem, 'reserved', requestSpy)

    expect(result.allowed).toBe(false)
    expect(requestSpy).not.toHaveBeenCalled()
  })

  it('Case 3: allows state change for non-sold item', () => {
    const availableItem = buildItem({ state: 'new', status: 'available', sale_id: null })
    const requestSpy = vi.fn()

    const result = runStockStateTransitionGuard(availableItem, 'reserved', requestSpy)

    expect(result.allowed).toBe(true)
    expect(requestSpy).toHaveBeenCalledTimes(1)
  })

  it('Case 4: maps backend 409 stock_conflict to friendly message', () => {
    const backendError = Object.assign(new Error('Operation failed'), { code: 'stock_conflict' })
    expect(resolveStockMutationErrorMessage(backendError, 'No se pudo cambiar estado')).toBe(STOCK_CONFLICT_MESSAGE)
  })

  it('blocks promo toggle for sold/linked stock', () => {
    const soldLinkedItem = buildItem({ state: 'sold', status: 'sold', sale_id: 'sale-xyz' })
    expect(canToggleStockPromo(soldLinkedItem)).toBe(false)
    expect(STOCK_PROMO_BLOCKED_MESSAGE).toContain('promo')
  })

  it('blocks delete stock operation at client layer', async () => {
    await expect(deleteStockItem('stock-123')).rejects.toMatchObject({
      message: STOCK_DELETE_BLOCKED_MESSAGE,
      code: 'stock_delete_blocked',
    })
  })
})
