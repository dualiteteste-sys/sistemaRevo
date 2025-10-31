import {
  Home, Users, Warehouse, ShoppingCart, Wrench, DollarSign,
  Settings, LifeBuoy, FileText, UserPlus, Package, Building2,
  Users2, Plug, UserSquare, Box, BarChart2, FileDown, ClipboardList,
  FileSignature, HeartHandshake, Store, Receipt, Truck, Percent,
  Bot, Undo2, ClipboardCheck, Banknote, Wallet, TrendingUp,
  TrendingDown, Landmark, FileSpreadsheet, LogOut
} from 'lucide-react';

export interface MenuItem {
  name: string;
  icon: React.ElementType;
  href: string;
  children?: {
    name: string;
    icon: React.ElementType;
    href: string;
  }[];
}

export const menuConfig: { name: string; icon: React.ElementType; href: string; gradient: string; children?: { name: string; icon: React.ElementType; href: string; }[]; }[] = [
  {
    name: 'Dashboard',
    icon: Home,
    href: '/app/dashboard',
    gradient: 'from-blue-500 to-blue-600',
  },
  {
    name: 'Cadastros',
    icon: Users,
    href: '#',
    gradient: 'from-green-500 to-green-600',
    children: [
      { name: 'Clientes e Fornecedores', icon: Users2, href: '/app/partners' },
      { name: 'Produtos', icon: Package, href: '/app/products' },
      { name: 'Serviços', icon: Wrench, href: '#' },
      { name: 'Vendedores', icon: UserSquare, href: '#' },
      { name: 'Embalagens', icon: Box, href: '#' },
      { name: 'Relatórios', icon: BarChart2, href: '#' },
    ],
  },
  {
    name: 'Suprimentos',
    icon: Warehouse,
    href: '#',
    gradient: 'from-orange-500 to-orange-600',
    children: [
      { name: 'Ordens de Compra', icon: ShoppingCart, href: '#' },
      { name: 'Notas de Entrada', icon: FileDown, href: '#' },
      { name: 'Controle de Estoques', icon: Warehouse, href: '#' },
      { name: 'Relatórios', icon: BarChart2, href: '#' },
    ]
  },
  {
    name: 'Vendas',
    icon: ShoppingCart,
    href: '#',
    gradient: 'from-red-500 to-red-600',
    children: [
        { name: 'Painel de Vendas', icon: BarChart2, href: '/app/sales-dashboard' },
        { name: 'Pedidos de Vendas', icon: ClipboardList, href: '#' },
        { name: 'Propostas Comerciais', icon: FileSignature, href: '#' },
        { name: 'CRM', icon: HeartHandshake, href: '#' },
        { name: 'PDV', icon: Store, href: '#' },
        { name: 'Notas Fiscais', icon: Receipt, href: '#' },
        { name: 'Expedição', icon: Truck, href: '#' },
        { name: 'Comissões', icon: Percent, href: '#' },
        { name: 'Painel de Automações', icon: Bot, href: '#' },
        { name: 'Devolução de Venda', icon: Undo2, href: '#' },
        { name: 'Relatórios', icon: BarChart2, href: '#' },
    ]
  },
  {
    name: 'Serviços',
    icon: Wrench,
    href: '#',
    gradient: 'from-amber-500 to-amber-600',
    children: [
        { name: 'Ordens de Serviço', icon: ClipboardCheck, href: '#' },
        { name: 'Contratos', icon: FileText, href: '#' },
        { name: 'Notas de Serviço', icon: Receipt, href: '#' },
        { name: 'Cobranças', icon: Banknote, href: '#' },
        { name: 'Relatórios', icon: BarChart2, href: '#' },
    ]
  },
  {
    name: 'Financeiro',
    icon: DollarSign,
    href: '#',
    gradient: 'from-emerald-500 to-emerald-600',
    children: [
        { name: 'Caixa', icon: Wallet, href: '#' },
        { name: 'Contas a Receber', icon: TrendingUp, href: '#' },
        { name: 'Contas a Pagar', icon: TrendingDown, href: '#' },
        { name: 'Cobranças Bancárias', icon: Landmark, href: '#' },
        { name: 'Extrato Bancário', icon: FileSpreadsheet, href: '#' },
        { name: 'Relatórios', icon: BarChart2, href: '#' },
    ]
  },
  {
    name: 'Configurações',
    icon: Settings,
    href: '#',
    gradient: 'from-gray-500 to-gray-600',
  },
  {
    name: 'Suporte',
    icon: LifeBuoy,
    href: '#',
    gradient: 'from-indigo-500 to-indigo-600',
  },
  {
    name: 'Sair',
    icon: LogOut,
    href: '#',
    gradient: 'from-slate-500 to-slate-600',
  },
];
