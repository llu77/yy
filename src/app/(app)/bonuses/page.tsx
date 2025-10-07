
'use client';
import React, { useContext, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Award, Users, DollarSign, ArrowDown, ArrowUp, Minus, Printer, CheckCircle } from "lucide-react";
import { BranchContext, DataContext } from '@/app/(app)/layout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { RevenueRecord } from '../revenue/page';
import pdfService from '@/services/pdf.service'; // NEW FEATURE
import { useAuth } from '@/hooks/use-auth'; // NEW FEATURE
import { formatCurrency } from '@/lib/utils'; // NEW FEATURE

const mockUsersData = {
    'فرع لبن': [
        { id: 'USR002', name: 'محمود عماره' },
        { id: 'USR003', name: 'علاء ناصر' },
        { id: 'USR001', name: 'عبدالحي' },
        { id: 'USR004', name: 'السيد' },
    ],
    'فرع طويق': [
        { id: 'USR006', name: 'محمد ناصر' },
        { id: 'USR007', name: 'فارس' },
        { id: 'USR008', name: 'السيد (طويق)' },
        { id: 'USR005', name: 'محمد إسماعيل' },
    ]
};

export const getBonusTier = (revenue: number) => {
    if (revenue >= 3500) return { bonus: 280, level: 5, color: "text-green-500", icon: <ArrowUp className="h-4 w-4" /> };
    if (revenue >= 2900) return { bonus: 220, level: 4, color: "text-green-400", icon: <ArrowUp className="h-4 w-4" /> };
    if (revenue >= 2400) return { bonus: 150, level: 3, color: "text-blue-500", icon: <Minus className="h-4 w-4" /> };
    if (revenue >= 1800) return { bonus: 100, level: 2, color: "text-yellow-500", icon: <ArrowDown className="h-4 w-4" /> };
    if (revenue >= 1300) return { bonus: 50, level: 1, color: "text-red-500", icon: <ArrowDown className="h-4 w-4" /> };
    return { bonus: 0, level: 0, color: "text-muted-foreground", icon: <Minus className="h-4 w-4" /> };
};

const weekLabels = ['الأسبوع الأول', 'الأسبوع الثاني', 'الأسبوع الثالث', 'الأسبوع الرابع', 'الأسبوع الخامس'];

// --- Component ---
export default function BonusesPage() {
  const { revenueRecords } = useContext(DataContext);
  const { currentBranch } = useContext(BranchContext);
  const { userDetails } = useAuth(); // NEW FEATURE
  const [selectedWeek, setSelectedWeek] = useState(0); 
  const { toast } = useToast();
  // NEW FEATURE: State to track weekly approvals
  const [weeklyApproval, setWeeklyApproval] = useState([false, false, false, false, false]);
  
  const branchName = currentBranch === 'laban' ? 'فرع لبن' : 'فرع طويق';
  const employeesForBranch = mockUsersData[branchName as keyof typeof mockUsersData] || [];

  const getWeeklyRevenueForEmployee = (employeeName: string, weekIndex: number) => {
    if (!revenueRecords) return 0;
    
    const weekRecords = revenueRecords.filter(record => {
        const recordDate = new Date(record.date);
        const dayOfMonth = recordDate.getDate();
        // weekIndex is 0-based, so week 1 is index 0 (days 1-7)
        const week = Math.floor((dayOfMonth - 1) / 7);
        return week === weekIndex;
    });

    return weekRecords
        .flatMap(r => r.distribution)
        .filter(d => d.employeeName === employeeName)
        .reduce((sum, d) => sum + d.amount, 0);
  };

  const weeklyCalculations = useMemo(() => {
    return employeesForBranch.map(emp => {
      const revenue = getWeeklyRevenueForEmployee(emp.name, selectedWeek);
      const { bonus, icon, color } = getBonusTier(revenue);
      return {
        ...emp,
        currentRevenue: revenue,
        currentBonus: bonus,
        icon,
        color,
      };
    });
  }, [employeesForBranch, selectedWeek, revenueRecords]);

  const totalCalculations = useMemo(() => {
     return employeesForBranch.map(emp => {
        let totalRevenue = 0;
        let totalBonus = 0;
        for (let i=0; i<5; i++) { // Month can have up to 5 weeks
            const weeklyRevenue = getWeeklyRevenueForEmployee(emp.name, i);
            totalRevenue += weeklyRevenue;
            totalBonus += getBonusTier(weeklyRevenue).bonus;
        }
        return {
            ...emp,
            totalRevenue,
            totalBonus
        };
     });
  }, [employeesForBranch, revenueRecords]);

  const selectedWeekTotalBonus = weeklyCalculations.reduce((sum, item) => sum + item.currentBonus, 0);
  const grandTotalBonus = totalCalculations.reduce((sum, item) => sum + item.totalBonus, 0);

  // NEW FEATURE: Handler for weekly bonus approval
  const handleApproveWeeklyBonus = () => {
    const newApprovalStatus = [...weeklyApproval];
    newApprovalStatus[selectedWeek] = true;
    setWeeklyApproval(newApprovalStatus);
    toast({
        title: "تم اعتماد البونص الأسبوعي بنجاح!",
        description: `تمت الموافقة على صرف بونص ${weekLabels[selectedWeek]}. يمكنك الآن طباعة الكشف.`,
        className: "bg-primary text-primary-foreground",
    });
  };

  // NEW FEATURE: Handler for printing weekly bonus report
  const handlePrintWeeklyBonus = () => {
    const tableData = weeklyCalculations.map(emp => [
        emp.name,
        formatCurrency(emp.currentRevenue),
        `المستوى ${getBonusTier(emp.currentRevenue).level}`,
        formatCurrency(emp.currentBonus)
    ]);
    
    const supervisor = { name: 'المشرف المسؤول' }; // Placeholder

    try {
      pdfService.generatePDF({
        title: `كشف بونص ${weekLabels[selectedWeek]}`,
        type: 'report',
        content: {
            table: {
                headers: [['اسم الموظف', 'إجمالي إيراداته', 'مستوى البونص', 'مبلغ البونص']],
                data: tableData
            }
        },
        userData: userDetails || { name: 'غير معروف', role: 'غير محدد' },
        branchData: {
            name: branchName,
            supervisorName: supervisor.name
        }
      });
      pdfService.print();
    } catch (error) {
      console.error('Print error:', error);
      toast({ 
        variant: 'destructive', 
        title: 'خطأ في الطباعة',
        description: 'حدث خطأ أثناء إنشاء التقرير. الرجاء المحاولة مرة أخرى.'
      });
    }
  };

  const handleApproveMonthlyBonus = () => {
    toast({
        title: "تم اعتماد البونص الشهري بنجاح!",
        description: `سيتم صرف مبلغ ${grandTotalBonus.toLocaleString('ar-SA')} ريال للموظفين.`,
        className: "bg-primary text-primary-foreground",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>حساب ومتابعة البونص الأسبوعي</CardTitle>
          <CardDescription>
            عرض تفصيلي للبونص المستحق للموظفين بناءً على الإيرادات الأسبوعية المحققة لكل فرع.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary"/>
                <span>فرع:</span>
                <span className="font-bold">{branchName}</span>
            </div>
            <div className="flex flex-col md:flex-row gap-4 items-center w-full md:w-auto">
                <Select value={String(selectedWeek)} onValueChange={(val) => setSelectedWeek(Number(val))}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="اختر الأسبوع" />
                    </SelectTrigger>
                    <SelectContent>
                        {weekLabels.map((label, index) => (
                            <SelectItem key={index} value={String(index)}>{label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <div className="flex items-center gap-2 p-3 rounded-lg bg-muted w-full justify-center md:w-auto">
                    <Award className="h-5 w-5 text-primary" />
                    <span className="text-sm text-muted-foreground">إجمالي بونص الأسبوع:</span>
                    <span className="font-bold text-primary text-lg">{selectedWeekTotalBonus.toLocaleString('ar-SA')} ريال</span>
                </div>
            </div>
        </CardContent>
      </Card>
      
      <Card>
          <CardHeader>
              <CardTitle>تفاصيل البونص لـ: {weekLabels[selectedWeek]}</CardTitle>
              <CardDescription>
                  يتم احتساب البونص لكل موظف بناءً على مستوى الإيرادات الذي حققه خلال هذا الأسبوع.
              </CardDescription>
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>اسم الموظف</TableHead>
                          <TableHead>إجمالي إيراداته للأسبوع</TableHead>
                          <TableHead>مستوى البونص</TableHead>
                          <TableHead className="text-primary text-right">مبلغ البونص المستحق</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {weeklyCalculations.map(emp => (
                          <TableRow key={emp.id}>
                              <TableCell className="font-medium">{emp.name}</TableCell>
                              <TableCell>{emp.currentRevenue.toLocaleString('ar-SA')} ريال</TableCell>
                              <TableCell className={`flex items-center gap-2 font-semibold ${emp.color}`}>
                                  {emp.icon}
                                  {emp.currentBonus > 0 ? `المستوى ${getBonusTier(emp.currentRevenue).level}` : 'لا يوجد'}
                              </TableCell>
                              <TableCell className="font-bold text-primary text-lg text-right">
                                {emp.currentBonus.toLocaleString('ar-SA')} ريال
                              </TableCell>
                          </TableRow>
                      ))}
                       <TableRow className="bg-muted/50 font-bold">
                          <TableCell colSpan={3}>الإجمالي للأسبوع المحدد</TableCell>
                          <TableCell className="text-primary text-lg text-right">{selectedWeekTotalBonus.toLocaleString('ar-SA')} ريال</TableCell>
                      </TableRow>
                  </TableBody>
              </Table>
          </CardContent>
           {/* NEW FEATURE: Weekly Approval and Print Footer */}
          <CardFooter className="justify-end pt-4 border-t">
              {weeklyApproval[selectedWeek] ? (
                  <Button onClick={handlePrintWeeklyBonus}>
                      <Printer className="mr-2 h-4 w-4" />
                      طباعة كشف البونص
                  </Button>
              ) : (
                  <Button variant="outline" onClick={handleApproveWeeklyBonus}>
                       <CheckCircle className="mr-2 h-4 w-4" />
                      اعتماد وصرف بونص الأسبوع
                  </Button>
              )}
          </CardFooter>
      </Card>

       <Card>
          <CardHeader>
              <CardTitle>الملخص الإجمالي للشهر (4 أسابيع)</CardTitle>
              <CardDescription>
                  نظرة شاملة على أداء الموظفين وإجمالي البونص المستحق لهم خلال الشهر.
              </CardDescription>
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>اسم الموظف</TableHead>
                          <TableHead>إجمالي إيراداته للشهر</TableHead>
                          <TableHead className="text-primary text-right">إجمالي البونص المستحق للشهر</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {totalCalculations.map(emp => (
                          <TableRow key={emp.id} className="hover:bg-primary/5">
                              <TableCell className="font-medium">{emp.name}</TableCell>
                              <TableCell>{emp.totalRevenue.toLocaleString('ar-SA')} ريال</TableCell>
                              <TableCell className="font-bold text-primary text-xl text-right">
                                {emp.totalBonus.toLocaleString('ar-SA')} ريال
                              </TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
          </CardContent>
          <CardFooter className="justify-end pt-6">
              <Button size="lg" onClick={handleApproveMonthlyBonus}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  اعتماد وصرف بونص الشهر
              </Button>
          </CardFooter>
      </Card>
    </div>
  );
}
