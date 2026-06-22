// Tipos globais da aplicação
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'customer' | 'admin' | 'seller';
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  cost?: number;
  category: string;
  image: string;
  images: string[];
  stock: number;
  sku: string;
  benefits: string[];
  faqs: FAQ[];
  socialProof: SocialProof;
  warranty?: string;
  idealFor: string;
  conditions: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface SocialProof {
  testimonials: Testimonial[];
  reviews: number;
  rating: number;
  customers: number;
}

export interface Testimonial {
  name: string;
  text: string;
  rating: number;
}

export interface CartItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'pix' | 'mercado_pago' | 'manual';
  paymentId?: string;
  deliveryAddress: Address;
  trackingNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Address {
  street: string;
  number: string;
  complement?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Lead {
  id: string;
  phone: string;
  email?: string;
  name: string;
  source: 'whatsapp' | 'website' | 'campaign' | 'funnel' | 'import';
  status: 'new' | 'contacted' | 'qualified' | 'customer' | 'lost';
  tags: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  lastContact?: Date;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  type: 'email' | 'whatsapp' | 'sms' | 'reminder';
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused';
  startDate: Date;
  endDate: Date;
  targetLeads: string[];
  message: string;
  scheduledTime?: string;
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Automation {
  id: string;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface AutomationTrigger {
  type: 'new_lead' | 'new_order' | 'payment_received' | 'abandoned_cart' | 'time_based';
  conditions?: Record<string, any>;
}

export interface AutomationAction {
  type: 'send_message' | 'send_email' | 'create_task' | 'update_lead' | 'trigger_webhook';
  params: Record<string, any>;
}

export interface Integration {
  id: string;
  type: 'evolution_api' | 'mercado_pago' | 'pushinpay' | 'zapier' | 'custom';
  name: string;
  status: 'active' | 'inactive' | 'error';
  config: Record<string, any>;
  lastSync?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  totalLeads: number;
  conversionRate: number;
  avgOrderValue: number;
  pendingOrders: number;
  thisMonthRevenue: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
