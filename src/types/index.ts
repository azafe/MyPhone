export type Role = 'admin' | 'seller' | 'owner' | 'user'

export type AuthUser = {
  id: string
  email: string
  full_name: string
  role: Role
}

export type Profile = {
  id: string
  full_name: string | null
  role: Role
  email?: string | null
  is_enabled?: boolean
}

export type StockState =
  | 'outlet'
  | 'used_premium'
  | 'sold'
  | 'reserved'
  | 'deposit'
  | 'new'
  | 'drawer'
  | 'service_tech'

export type StockStatus =
  | StockState
  | 'available'
  | 'reserved'
  | 'sold'
  | 'service_tech'
  | 'drawer'

export type TradeStatus = 'pending' | 'valued' | 'added_to_stock' | 'sold' | 'rejected'

export type StockItem = {
  id: string
  state?: StockState | null
  status?: StockStatus | null
  category?: string | null
  brand?: string | null
  model: string
  storage_gb?: number | null
  color?: string | null
  color_other?: string | null
  condition?: string | null
  imei?: string | null
  battery_pct?: number | null
  purchase_usd?: number | null
  fx_rate_used?: number | null
  purchase_ars?: number | null
  sale_price_usd?: number | null
  sale_price_ars?: number | null
  warranty_days?: number | null
  provider_name?: string | null
  details?: string | null
  received_at?: string | null
  is_promo?: boolean | null
  is_sealed?: boolean | null
  reserve_type?: 'reserva' | 'sena' | null
  reserve_amount_ars?: number | null
  reserve_notes?: string | null
  days_in_stock?: number | null
  created_at?: string
  updated_at?: string
}

export type Sale = {
  id: string
  sale_date?: string | null
  created_at?: string
  seller_id?: string | null
  seller_name?: string | null
  seller_full_name?: string | null
  customer_id?: string | null
  customer_name?: string | null
  customer_phone?: string | null
  customer_dni?: string | null
  customer?: {
    name?: string | null
    full_name?: string | null
    phone?: string | null
    dni?: string | null
  } | null
  payment_method?: 'cash' | 'transfer' | 'card' | 'mixed' | 'deposit' | 'trade_in' | string | null
  method?: 'cash' | 'transfer' | 'card' | 'mixed' | 'deposit' | 'trade_in' | string | null
  card_brand?: string | null
  installments?: number | null
  surcharge_pct?: number | null
  deposit_ars?: number | null
  total_ars: number
  total_usd?: number | null
  currency?: 'ARS' | 'USD' | string | null
  fx_rate_used?: number | null
  balance_due_ars?: number | null
  notes?: string | null
  details?: string | null
  includes_cube_20w?: boolean | null
  status?: 'paid' | 'completed' | 'pending' | 'cancelled' | string | null
  stock_item_id?: string | null
  stock_model?: string | null
  stock_imei?: string | null
  stock_brand?: string | null
  stock_storage_gb?: number | null
  stock_color?: string | null
  stock_condition?: string | null
  stock_battery_pct?: number | null
  items?: SaleItem[]
  payments?: SalePayment[]
}

export type SaleItem = {
  id?: string
  stock_item_id?: string | null
  qty?: number
  model?: string | null
  storage_gb?: number | null
  battery_pct?: number | null
  color?: string | null
  imei?: string | null
  sale_price_ars?: number | null
  sale_price_usd?: number | null
}

export type SalePayment = {
  id?: string
  method: string
  currency: 'ARS' | 'USD'
  amount: number
  amount_ars?: number | null
  amount_usd?: number | null
  card_brand?: string | null
  installments?: number | null
  surcharge_pct?: number | null
  note?: string | null
}

export type TradeIn = {
  id: string
  trade_date?: string | null
  sale_ref?: string | null
  customer_name?: string | null
  customer_phone?: string | null
  customer_dni?: string | null
  brand?: string | null
  model: string
  storage?: string | null
  storage_gb?: number | null
  battery_pct?: number | null
  color?: string | null
  condition?: string | null
  imei?: string | null
  trade_value_usd?: number | null
  fx_rate_used?: number | null
  trade_value_ars: number
  suggested_value_ars?: number | null
  details?: string | null
  observation?: string | null
  converted_stock_item_id?: string | null
  notes?: string | null
  status: TradeStatus
  created_at?: string
}

export type Warranty = {
  id: string
  warranty_date?: string | null
  sale_id?: string | null
  stock_item_id?: string | null
  customer_name?: string | null
  customer_phone?: string | null
  customer_dni?: string | null
  original_model?: string | null
  original_imei?: string | null
  failure?: string | null
  resolution?: 'swap' | 'repair' | 'refund' | string | null
  case_status?: 'open' | 'in_progress' | 'closed' | string | null
  imei?: string | null
  starts_at?: string | null
  ends_at?: string | null
  status?: 'active' | 'expired' | string | null
  issue_reason?: string | null
  replacement_stock_item_id?: string | null
  replacement_device_label?: string | null
  notes?: string | null
  replaced_at?: string | null
  created_at?: string
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
  storage_gb?: number | null
  battery_min: number
  battery_max: number
  pct_of_reference?: number | null
  value_ars?: number | null
  created_at?: string
  updated_at?: string
}

export type InstallmentMode = 'without_mp' | 'with_mp'

export type InstallmentQuote = {
  installments: number
  surcharge_pct: number
  total_ars: number
  installment_ars: number
}

export type QuoteSnapshotPayload = {
  sale_id?: string
  card_brand: string
  mode: InstallmentMode
  currency: 'ARS' | 'USD'
  base_price: number
  usd_rate: number
  rows: InstallmentQuote[]
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
