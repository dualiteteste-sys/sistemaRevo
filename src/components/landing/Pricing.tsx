import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthProvider';
import { useToast } from '../../contexts/ToastProvider';
import { Loader2 } from 'lucide-react';
import { Database } from '../../types/database.types';
import { startCheckout } from '../../lib/billing';

type Plan = Database['public']['Tables']['plans']['Row'];

interface PricingProps {
  onSignUpClick: () => void;
}

const planSubtitles: { [key: string]: string } = {
  START: 'Empreendedores e Micro Empresas',
  PRO: 'PMEs em Crescimento',
  MAX: 'Recursos Avançados',
  ULTRA: 'Indústrias e alta demanda de armazenamento',
};

const Pricing: React.FC<PricingProps> = ({ onSignUpClick }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const { session, activeEmpresa } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('active', true)
        .order('amount_cents', { ascending: true });

      if (error) {
        console.error('Erro ao buscar planos:', error);
        addToast('Não foi possível carregar os planos.', 'error');
      } else {
        setPlans(data);
      }
      setLoading(false);
    };
    fetchPlans();
  }, [addToast]);
  
  const handleCheckout = async (plan: Plan) => {
    if (!session) {
      addToast("Você precisa criar uma conta para iniciar um teste.", "info");
      onSignUpClick();
      return;
    }
    if (!activeEmpresa) {
      addToast("Crie sua primeira empresa para poder assinar um plano.", "info");
      // Idealmente, aqui abriríamos o modal de criação de empresa
      return;
    }

    setCheckoutLoading(plan.id);

    try {
      await startCheckout(
        activeEmpresa.id, 
        plan.slug as "START" | "PRO" | "MAX" | "ULTRA", 
        plan.billing_cycle
      );
      // A página será redirecionada se a função for bem-sucedida
    } catch (error: any) {
      console.error("Erro ao criar sessão de checkout:", error);
      addToast(error.message || "Erro ao iniciar o checkout.", "error");
    } finally {
      setCheckoutLoading(null);
    }
  };


  const currentPlans = plans.filter(p => p.billing_cycle === billingCycle);

  return (
    <section id="pricing" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Planos flexíveis para cada etapa do seu negócio
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Comece de graça por 30 dias. Cancele a qualquer momento.
          </p>
        </div>

        <div className="mt-10 flex justify-center items-center">
          <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-blue-600' : 'text-gray-500'}`}>
            Mensal
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            className={`mx-4 relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none ${billingCycle === 'yearly' ? 'bg-blue-600' : 'bg-gray-200'}`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${billingCycle === 'yearly' ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
          <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-blue-600' : 'text-gray-500'}`}>
            Anual
          </span>
          <span className="ml-3 bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            Economize até 3 meses!
          </span>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl p-8 shadow-lg bg-gray-100 animate-pulse h-[28rem]"></div>
            ))
          ) : (
            currentPlans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative flex flex-col rounded-2xl p-6 sm:p-8 shadow-lg h-full border ${
                  plan.slug === 'PRO' ? 'bg-gray-800 text-white border-blue-500' : 'bg-white border-gray-200'
                }`}
              >
                {plan.slug === 'PRO' && (
                  <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                    <div className="bg-blue-500 text-white text-xs font-bold px-4 py-1 rounded-full uppercase">
                      Popular
                    </div>
                  </div>
                )}
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <p className={`mt-1 text-sm h-10 ${plan.slug === 'PRO' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {planSubtitles[plan.slug] || ''}
                </p>
                
                <div className="mt-4 flex items-baseline">
                  <span className={`font-bold text-4xl ${plan.slug === 'PRO' ? 'text-white' : 'text-gray-900'}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.amount_cents / 100)}
                  </span>
                  <span className={`ml-1 text-sm ${plan.slug === 'PRO' ? 'text-gray-400' : 'text-gray-500'}`}>
                    /mês
                  </span>
                </div>
                
                <div className="flex-grow"></div>

                <div className="mt-8 space-y-3">
                  <button
                    onClick={() => handleCheckout(plan)}
                    disabled={checkoutLoading === plan.id}
                    className={`w-full py-3 px-4 text-base font-semibold rounded-lg transition-transform duration-200 flex items-center justify-center border ${
                      plan.slug === 'PRO'
                        ? 'border-gray-500 text-gray-300 hover:bg-gray-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                    } disabled:opacity-70 disabled:cursor-not-allowed`}
                  >
                    {checkoutLoading === plan.id ? <Loader2 className="animate-spin" /> : 'Assinar'}
                  </button>
                  <button
                    onClick={() => handleCheckout(plan)}
                    disabled={checkoutLoading === plan.id}
                    className={`w-full py-3 px-4 text-base font-semibold rounded-lg transition-transform duration-200 flex items-center justify-center ${
                      plan.slug === 'PRO'
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    } disabled:opacity-70 disabled:cursor-not-allowed`}
                  >
                    {checkoutLoading === plan.id ? <Loader2 className="animate-spin" /> : 'Teste 30 dias grátis'}
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
