export type Role = 'admin' | 'seller'

export type Profile = {
  id: string
  full_name: string | null
  role: Role
  email?: string | null
  is_enabled?: boolean
}

export type StockStatus = 'available' | 'reserved' | 'sold' | 'service_tech' | 'drawer'
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
  provider_name?: string | null
  details?: string | null
  received_at?: string | null
  is_promo?: boolean | null
  is_sealed?: boolean | null
  created_at?: string
}

export type Sale = {
  id: string
  stock_item_id: string | null
  stock_model?: string | null
  stock_imei?: string | null
  stock_brand?: string | null
  stock_storage_gb?: number | null
  stock_color?: string | null
  stock_condition?: string | null
  stock_battery_pct?: number | null
  customer_name: string
  customer_phone: string
  customer?: {
    name?: string | null
    full_name?: string | null
    phone?: string | null
  } | null
  method: 'cash' | 'transfer' | 'card' | 'mixed' | 'trade_in'
  status?: 'paid' | 'completed' | 'pending' | 'cancelled' | string | null
  seller_name?: string | null
  seller_full_name?: string | null
  card_brand?: string | null
  installments?: number | null
  surcharge_pct?: number | null
  total_ars: number
  total_usd?: number | null
  currency?: 'ARS' | 'USD' | string | null
  fx_rate_used?: number | null
  deposit_ars?: number | null
  balance_due_ars?: number | null
  notes?: string | null
  includes_cube_20w?: boolean | null
  sale_date?: string | null
  created_at?: string
}

export type TradeIn = {
  id: string
  sale_ref?: string | null
  customer_name?: string | null
  customer_phone?: string | null
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
  issue_reason?: string | null
  replacement_stock_item_id?: string | null
  replacement_device_label?: string | null
  notes?: string | null
  replaced_at?: string | null
}

export type InstallmentRule = {
  id: string
  channel?: string | null
  card_brand: string
  installments: number
  surcharge_pct: number
}

export type PlanCanjeValue = {
  id: string
  model: string
  battery_min: number
  battery_max: number
  pct_of_reference: number
  created_at?: string
  updated_at?: string
}

export type FinanceSummary = {
  sales_month: number
  sales_month_usd?: number | null
  margin_month: number
  sales_total?: number
  margin_total?: number
  sales_count?: number
  total_sales_count?: number
  orders_count?: number
  ticket_avg?: number
  avg_ticket?: number
  payment_mix: Array<{ method: string; total: number }>
  open_tradeins: number
}
