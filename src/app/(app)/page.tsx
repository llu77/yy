
'use client';

import React, { useContext, useMemo } from 'react';
import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { AiSummary } from "@/components/dashboard/ai-summary";
import { DollarSign, Landmark, Wallet, Users } from "lucide-react";
import { BranchContext, DataContext } from './layout';
import { formatCurrency } from '@/lib/utils';
import { getBonusTier } from './bonuses/page';


export default function DashboardPage() {
  const { currentBranch } = useContext(BranchContext);
  const { revenueRecords, expenses } = useContext(DataContext);

  const branchStats = useMemo(() => {
    // Data is now pre-filtered by the DataContext based on the selected branch.
    const totalRevenue = revenueRecords.reduce((acc, record) => acc + record.totalRevenue, 0);
    const totalExpenses = expenses.reduce((acc, expense) => acc + expense.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    
    // Calculate weekly bonus based on this week's revenue
    const today = new Date();
    const weekOfMonth = Math.floor((today.getDate() - 1) / 7);
    
    const weeklyRevenue = revenueRecords
      .filter(record => {
          const recordDate = new Date(record.date);
          const recordWeek = Math.floor((recordDate.getDate() - 1) / 7);
          return recordDate.getMonth() === today.getMonth() && recordWeek === weekOfMonth;
      })
      .reduce((sum, record) => sum + record.totalRevenue, 0);

    const totalBonus = getBonusTier(weeklyRevenue).bonus * 4; // Simplified estimate for all employees
    
    return {
      revenue: formatCurrency(totalRevenue),
      expenses: formatCurrency(totalExpenses),
      profit: formatCurrency(netProfit),
      bonus: formatCurrency(totalBonus),
      bonusDesc: "تقديري لهذا الأسبوع",
    };

  }, [revenueRecords, expenses]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="إجمالي الإيرادات"
          value={branchStats.revenue}
          icon={DollarSign}
          description="للفرع المحدد هذا الشهر"
        />
        <StatCard
          title="إجمالي المصاريف"
          value={branchStats.expenses}
          icon={Wallet}
          description="للفرع المحدد هذا الشهر"
        />
        <StatCard
          title="الأرباح الصافية"
          value={branchStats.profit}
          icon={Landmark}
          description="للفرع المحدد هذا الشهر"
        />
         <StatCard
          title="بونص هذا الأسبوع"
          value={branchStats.bonus}
          icon={Users}
          description={branchStats.bonusDesc}
        />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
            <RevenueChart chartData={revenueRecords}/>
        </div>
        <div className="xl:col-span-1">
            <AiSummary />
        </div>
      </div>
    </div>
  );
}
