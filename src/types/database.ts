export type MembershipRole = 'admin' | 'atendente' | 'financeiro';

export type MarketplaceType =
  | 'mercado_livre'
  | 'amazon'
  | 'tiktok_shop'
  | 'shopee'
  | 'magalu'
  | 'americanas'
  | 'shein';

export type ConnectionStatus = 'connected' | 'expired' | 'error' | 'disconnected';

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface Membership {
  id: string;
  org_id: string;
  user_id: string;
  role: MembershipRole;
  created_at: string;
}

export interface MarketplaceConnection {
  id: string;
  org_id: string;
  marketplace: MarketplaceType;
  label: string;
  status: ConnectionStatus;
  external_account_id: string | null;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  expires_at: string | null;
  connected_at: string;
  created_at: string;
}

export interface SyncState {
  id: string;
  org_id: string;
  marketplace_connection_id: string;
  resource: 'orders' | 'questions' | 'listings' | 'reputation';
  last_synced_at: string | null;
  last_status: string | null;
  last_error: string | null;
}

export interface QuestionThread {
  id: string;
  org_id: string;
  marketplace_connection_id: string;
  product_listing_id: string | null;
  external_thread_id: string;
  question_text: string | null;
  status: string;
  last_message_at: string | null;
  answered_at: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  org_id: string;
  marketplace_connection_id: string;
  external_order_id: string;
  status: string | null;
  order_value: number | null;
  freight_value: number | null;
  freight_ratio: number | null;
  is_free_shipping: boolean;
  ordered_at: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  org_id: string;
  order_id: string;
  product_listing_id: string | null;
  sku: string | null;
  title: string | null;
  quantity: number;
  unit_price: number | null;
}

export interface Product {
  id: string;
  org_id: string;
  sku: string;
  title: string;
  package_weight_kg: number | null;
  package_height_cm: number | null;
  package_width_cm: number | null;
  package_length_cm: number | null;
  created_at: string;
}

export interface ProductListing {
  id: string;
  org_id: string;
  product_id: string;
  marketplace_connection_id: string;
  external_id: string;
  title: string | null;
  price: number | null;
  status: string | null;
  quality_score: number | null;
  created_at: string;
}

export interface ReputationMetric {
  id: string;
  org_id: string;
  marketplace_connection_id: string;
  metric_date: string;
  metrics: {
    level_id: string | null;
    power_seller_status: string | null;
    claims_rate: number | null;
    delayed_handling_rate: number | null;
    cancellations_rate: number | null;
  };
  created_at: string;
}

export interface ChatMessage {
  id: string;
  org_id: string;
  thread_id: string;
  sender: string;
  body: string | null;
  sent_at: string;
}

export interface ErpConnection {
  id: string;
  org_id: string;
  provider: string;
  label: string;
  status: ConnectionStatus;
  expires_at: string | null;
  created_at: string;
}
