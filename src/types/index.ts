export type Role = 'admin' | 'seller'

export type Profile = {
  id: string
  email: string
  full_name: string | null
  role: Role
  active?: boolean
}

export type StockStatus = 'available' | 'reserved' | 'sold'
export type TradeStatus = 'pending' | 'valued' | 'added_to_stock' | 'sold' | 'rejected'

export type StockItem = {
  id: string
  category: string
  brand: string
  model: string
  storage_gb?: number | null
  color?: string | null
  color_other?: string | null
  condition: string
  imei?: string | null
  battery_pct?: number | null
  purchase_usd: number
  fx_rate_used: number
  purchase_ars: number
  sale_price_usd?: number | null
  sale_price_ars: number
  warranty_days: number
  status: StockStatus
  created_at?: string
}

export type Sale = {
  id: string
  stock_item_id: string
  customer_name: string
  customer_phone: string
  method: 'cash' | 'transfer' | 'card' | 'mixed' | 'trade_in'
  card_brand?: string | null
  installments?: number | null
  surcharge_pct?: number | null
  total_ars: number
  deposit_ars?: number | null
  created_at?: string
}

export type TradeIn = {
  id: string
  brand: string
  model: string
  storage?: string | null
  color?: string | null
  condition: string
  imei?: string | null
  trade_value_usd: number
  fx_rate_used: number
  trade_value_ars: number
  notes?: string | null
  status: TradeStatus
  created_at?: string
}

export type Warranty = {
  id: string
  sale_id: string
  stock_item_id: string
  customer_name: string
  customer_phone: string
  imei?: string | null
  starts_at: string
  ends_at: string
  status: 'active' | 'expired'
}

export type InstallmentRule = {
  id: string
  card_brand: string
  installments: number
  surcharge_pct: number
}

export type FinanceSummary = {
  sales_month: number
  margin_month: number
  payment_mix: Array<{ method: string; total: number }>
  open_tradeins: number
}
