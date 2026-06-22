import {
  Order,
  Lead,
  Campaign,
  Automation,
  Integration,
  DashboardStats,
  User,
} from '@/types';

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

export const mockStats: DashboardStats = {
  totalOrders: 342,
  totalRevenue: 48720.5,
  totalCustomers: 187,
  totalLeads: 524,
  conversionRate: 23.4,
  avgOrderValue: 142.4,
  pendingOrders: 12,
  thisMonthRevenue: 12840.0,
};

export const mockSalesByDay = [
  { day: 'Seg', vendas: 12, receita: 1840 },
  { day: 'Ter', vendas: 19, receita: 2710 },
  { day: 'Qua', vendas: 15, receita: 2130 },
  { day: 'Qui', vendas: 22, receita: 3240 },
  { day: 'Sex', vendas: 28, receita: 4180 },
  { day: 'Sáb', vendas: 18, receita: 2560 },
  { day: 'Dom', vendas: 9, receita: 1290 },
];

export const mockTopProducts = [
  { name: 'Plano Premium Anual', vendas: 84, receita: 16800 },
  { name: 'Plano Mensal', vendas: 142, receita: 8520 },
  { name: 'Curso Completo', vendas: 56, receita: 11200 },
  { name: 'Mentoria VIP', vendas: 18, receita: 9000 },
  { name: 'E-book Estratégico', vendas: 210, receita: 3200 },
];

export const mockOrders: Order[] = [
  {
    id: 'ORD-2041',
    userId: 'u-101',
    items: [{ productId: 'p1', productName: 'Plano Premium Anual', quantity: 1, price: 200, subtotal: 200 }],
    status: 'paid',
    subtotal: 200,
    tax: 0,
    total: 200,
    paymentMethod: 'pix',
    paymentId: 'pix_8841',
    deliveryAddress: { street: 'Rua A', number: '100', city: 'São Paulo', state: 'SP', zipCode: '01000-000', country: 'BR' },
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
  },
  {
    id: 'ORD-2040',
    userId: 'u-102',
    items: [{ productId: 'p2', productName: 'Plano Mensal', quantity: 1, price: 60, subtotal: 60 }],
    status: 'pending',
    subtotal: 60,
    tax: 0,
    total: 60,
    paymentMethod: 'mercado_pago',
    deliveryAddress: { street: 'Rua B', number: '22', city: 'Rio de Janeiro', state: 'RJ', zipCode: '20000-000', country: 'BR' },
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
  },
  {
    id: 'ORD-2039',
    userId: 'u-103',
    items: [{ productId: 'p3', productName: 'Curso Completo', quantity: 1, price: 200, subtotal: 200 }],
    status: 'processing',
    subtotal: 200,
    tax: 0,
    total: 200,
    paymentMethod: 'pix',
    paymentId: 'pix_8830',
    deliveryAddress: { street: 'Rua C', number: '5', city: 'Belo Horizonte', state: 'MG', zipCode: '30000-000', country: 'BR' },
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: 'ORD-2038',
    userId: 'u-104',
    items: [{ productId: 'p4', productName: 'Mentoria VIP', quantity: 1, price: 500, subtotal: 500 }],
    status: 'delivered',
    subtotal: 500,
    tax: 0,
    total: 500,
    paymentMethod: 'mercado_pago',
    paymentId: 'mp_7720',
    deliveryAddress: { street: 'Rua D', number: '88', city: 'Curitiba', state: 'PR', zipCode: '80000-000', country: 'BR' },
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },
  {
    id: 'ORD-2037',
    userId: 'u-105',
    items: [{ productId: 'p5', productName: 'E-book Estratégico', quantity: 2, price: 15, subtotal: 30 }],
    status: 'cancelled',
    subtotal: 30,
    tax: 0,
    total: 30,
    paymentMethod: 'pix',
    deliveryAddress: { street: 'Rua E', number: '3', city: 'Salvador', state: 'BA', zipCode: '40000-000', country: 'BR' },
    createdAt: daysAgo(3),
    updatedAt: daysAgo(2),
  },
];

export const mockCustomers: (User & { orders: number; spent: number })[] = [
  { id: 'u-101', name: 'Ana Souza', email: 'ana@email.com', phone: '+55 11 99999-0001', role: 'customer', createdAt: daysAgo(40), updatedAt: daysAgo(0), orders: 5, spent: 1200 },
  { id: 'u-102', name: 'Bruno Lima', email: 'bruno@email.com', phone: '+55 21 99999-0002', role: 'customer', createdAt: daysAgo(30), updatedAt: daysAgo(0), orders: 2, spent: 320 },
  { id: 'u-103', name: 'Carla Dias', email: 'carla@email.com', phone: '+55 31 99999-0003', role: 'customer', createdAt: daysAgo(25), updatedAt: daysAgo(1), orders: 8, spent: 2400 },
  { id: 'u-104', name: 'Diego Alves', email: 'diego@email.com', phone: '+55 41 99999-0004', role: 'customer', createdAt: daysAgo(15), updatedAt: daysAgo(1), orders: 1, spent: 500 },
  { id: 'u-105', name: 'Eduarda Melo', email: 'edu@email.com', phone: '+55 71 99999-0005', role: 'customer', createdAt: daysAgo(10), updatedAt: daysAgo(2), orders: 3, spent: 90 },
];

export const mockLeads: Lead[] = [
  { id: 'l-301', name: 'Felipe Castro', phone: '+55 11 98888-1001', email: 'felipe@email.com', source: 'whatsapp', status: 'new', tags: ['quente', 'instagram'], createdAt: daysAgo(0), updatedAt: daysAgo(0) },
  { id: 'l-302', name: 'Gabriela Reis', phone: '+55 21 98888-1002', source: 'funnel', status: 'contacted', tags: ['funil-gratis'], createdAt: daysAgo(1), updatedAt: daysAgo(0), lastContact: daysAgo(0) },
  { id: 'l-303', name: 'Henrique Ramos', phone: '+55 31 98888-1003', email: 'henrique@email.com', source: 'campaign', status: 'qualified', tags: ['remarketing'], createdAt: daysAgo(2), updatedAt: daysAgo(1), lastContact: daysAgo(1) },
  { id: 'l-304', name: 'Isabela Costa', phone: '+55 41 98888-1004', source: 'website', status: 'customer', tags: ['convertido'], createdAt: daysAgo(5), updatedAt: daysAgo(2), lastContact: daysAgo(2) },
  { id: 'l-305', name: 'João Pedro', phone: '+55 51 98888-1005', source: 'import', status: 'lost', tags: ['frio'], createdAt: daysAgo(8), updatedAt: daysAgo(4), lastContact: daysAgo(6) },
  { id: 'l-306', name: 'Karina Nunes', phone: '+55 61 98888-1006', email: 'karina@email.com', source: 'whatsapp', status: 'new', tags: ['quente'], createdAt: daysAgo(0), updatedAt: daysAgo(0) },
];

export const mockCampaigns: Campaign[] = [
  { id: 'c-201', name: 'Black Friday WhatsApp', description: 'Disparo para base quente', type: 'whatsapp', status: 'running', startDate: daysAgo(2), endDate: daysAgo(-3), targetLeads: ['l-301', 'l-306'], message: 'Oferta especial só hoje!', sentCount: 420, openedCount: 310, clickedCount: 96, createdAt: daysAgo(3), updatedAt: daysAgo(0) },
  { id: 'c-202', name: 'Remarketing carrinho', description: 'Recupera carrinhos abandonados', type: 'whatsapp', status: 'scheduled', startDate: daysAgo(-1), endDate: daysAgo(-5), targetLeads: ['l-303'], message: 'Você esqueceu algo no carrinho 👀', sentCount: 0, openedCount: 0, clickedCount: 0, createdAt: daysAgo(1), updatedAt: daysAgo(0) },
  { id: 'c-203', name: 'Boas-vindas e-mail', description: 'Onboarding novos leads', type: 'email', status: 'completed', startDate: daysAgo(20), endDate: daysAgo(13), targetLeads: ['l-304'], message: 'Seja bem-vindo!', sentCount: 180, openedCount: 142, clickedCount: 51, createdAt: daysAgo(21), updatedAt: daysAgo(13) },
  { id: 'c-204', name: 'Reativação base fria', description: 'Reengajar leads inativos', type: 'whatsapp', status: 'draft', startDate: daysAgo(-7), endDate: daysAgo(-14), targetLeads: ['l-305'], message: 'Sentimos sua falta!', sentCount: 0, openedCount: 0, clickedCount: 0, createdAt: daysAgo(0), updatedAt: daysAgo(0) },
];

export const mockAutomations: Automation[] = [
  { id: 'a-101', name: 'Boas-vindas novo lead', description: 'Envia mensagem ao captar lead novo', trigger: { type: 'new_lead' }, actions: [{ type: 'send_message', params: { template: 'welcome' } }], status: 'active', createdAt: daysAgo(30), updatedAt: daysAgo(2) },
  { id: 'a-102', name: 'Cobrança PIX pendente', description: 'Lembra cliente de pagamento pendente após 1h', trigger: { type: 'new_order', conditions: { status: 'pending' } }, actions: [{ type: 'send_message', params: { template: 'pix_reminder' } }, { type: 'create_task', params: { assignTo: 'vendas' } }], status: 'active', createdAt: daysAgo(28), updatedAt: daysAgo(1) },
  { id: 'a-103', name: 'Carrinho abandonado', description: 'Recupera carrinho após 30min', trigger: { type: 'abandoned_cart' }, actions: [{ type: 'send_message', params: { template: 'cart_recovery' } }], status: 'active', createdAt: daysAgo(20), updatedAt: daysAgo(3) },
  { id: 'a-104', name: 'Pós-venda upsell', description: 'Oferece upgrade após pagamento confirmado', trigger: { type: 'payment_received' }, actions: [{ type: 'send_message', params: { template: 'upsell' } }, { type: 'update_lead', params: { status: 'customer' } }], status: 'inactive', createdAt: daysAgo(15), updatedAt: daysAgo(5) },
];

export const mockIntegrations: Integration[] = [
  { id: 'i-1', type: 'evolution_api', name: 'Evolution API (WhatsApp)', status: 'active', config: { instance: 'jetbot-main', url: 'https://evo.seudominio.com' }, lastSync: daysAgo(0), createdAt: daysAgo(60), updatedAt: daysAgo(0) },
  { id: 'i-2', type: 'mercado_pago', name: 'Mercado Pago', status: 'active', config: { account: 'trustflix@mp.com' }, lastSync: daysAgo(0), createdAt: daysAgo(60), updatedAt: daysAgo(0) },
  { id: 'i-3', type: 'pushinpay', name: 'PushinPay (PIX)', status: 'active', config: { token: '••••••••' }, lastSync: daysAgo(0), createdAt: daysAgo(45), updatedAt: daysAgo(0) },
  { id: 'i-4', type: 'zapier', name: 'Zapier', status: 'inactive', config: {}, createdAt: daysAgo(30), updatedAt: daysAgo(10) },
];

export const statusColors: Record<string, string> = {
  // orders
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
  // leads
  new: 'bg-purple-100 text-purple-800',
  contacted: 'bg-blue-100 text-blue-800',
  qualified: 'bg-amber-100 text-amber-800',
  customer: 'bg-green-100 text-green-800',
  lost: 'bg-gray-100 text-gray-600',
  // campaigns / automations / integrations
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-100 text-blue-800',
  running: 'bg-green-100 text-green-800',
  completed: 'bg-emerald-100 text-emerald-800',
  paused: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-600',
  error: 'bg-red-100 text-red-800',
};

export const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatDate = (d: Date | string) =>
  new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
