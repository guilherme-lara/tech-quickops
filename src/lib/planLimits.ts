export type PlanType = 'free' | 'starter' | 'pro' | 'premium';

export interface PlanLimit {
  maxTecnicos: number;
  maxOsMes: number;
  hasFinanceiro: boolean;
  hasDashboard: boolean;
}

export const PlanLimits: Record<PlanType, PlanLimit> = {
  free: { 
    maxTecnicos: 1, 
    maxOsMes: 15, 
    hasFinanceiro: false, 
    hasDashboard: false 
  },
  starter: { 
    maxTecnicos: 3, 
    maxOsMes: 50, 
    hasFinanceiro: false, 
    hasDashboard: true 
  },
  pro: { 
    maxTecnicos: 10, 
    maxOsMes: 200, 
    hasFinanceiro: true, 
    hasDashboard: true 
  },
  premium: { 
    maxTecnicos: 99999, 
    maxOsMes: 99999, 
    hasFinanceiro: true, 
    hasDashboard: true 
  }
};
