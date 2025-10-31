import { Building, Users, UserCog, CreditCard, Trash2 } from 'lucide-react';

export interface SettingsTab {
  name: string;
  menu: SettingsMenuItem[];
}

export interface SettingsMenuItem {
  name: string;
  icon: React.ElementType;
}

export const settingsMenuConfig: SettingsTab[] = [
  {
    name: 'Geral',
    menu: [
      { name: 'Empresa', icon: Building },
      { name: 'Usuários', icon: Users },
      { name: 'Perfil de Usuário', icon: UserCog },
      { name: 'Minha Assinatura', icon: CreditCard },
    ],
  },
  {
    name: 'Avançado',
    menu: [
      { name: 'Limpeza de Dados', icon: Trash2 },
    ],
  },
  {
    name: 'Cadastros',
    menu: [],
  },
  {
    name: 'Suprimentos',
    menu: [],
  },
  {
    name: 'Vendas',
    menu: [],
  },
  {
    name: 'Serviços',
    menu: [],
  },
  {
    name: 'Notas Fiscais',
    menu: [],
  },
  {
    name: 'Financeiro',
    menu: [],
  },
  {
    name: 'E-Commerce',
    menu: [],
  },
];
