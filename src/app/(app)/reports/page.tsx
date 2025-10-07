
'use client';

import React, { useState, useMemo, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDown, BarChart2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataContext, BranchContext } from '@/app/(app)/layout';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import pdfService from '@/services/pdf.service';
import { useAuth } from '@/hooks/use-auth';
import type { RevenueRecord } from '../revenue/page';
import type { Expense } from '../expenses/page';

type ReportType = 'revenue' | 'expenses' | 'profit_loss';

export default function ReportsPage() {
    const { revenueRecords, expenses } = useContext(DataContext);
    const { currentBranch } = useContext(BranchContext);
    const { userDetails } = useAuth();
    const { toast } = useToast();

    const [reportType, setReportType] = useState<ReportType>('revenue');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reportData, setReportData] = useState<any[]>([]);
    const [reportTitle, setReportTitle] = useState('');

    const handleGenerateReport = () => {
        if (!reportType || !startDate || !endDate) {
            toast({
                variant: "destructive",
                title: "بيانات ناقصة",
                description: "الرجاء تحديد كافة الخيارات لإنشاء التقرير.",
            });
            return;
        }

        const sDate = new Date(startDate);
        const eDate = new Date(endDate);

        let data;
        let title;
        const branchName = currentBranch === 'laban' ? 'فرع لبن' : 'فرع طويق';

        if (reportType === 'revenue') {
            title = `تقرير الإيرادات لفرع ${branchName}`;
            data = revenueRecords.filter(r => {
                const rDate = new Date(r.date);
                return r.branch === branchName && rDate >= sDate && rDate <= eDate;
            });
        } else {
            title = `تقرير المصروفات لفرع ${branchName}`;
            data = expenses.filter(e => {
                const eDateObj = new Date(e.date);
                return e.branch === branchName && eDateObj >= sDate && eDateObj <= eDate;
            });
        }
        
        setReportData(data);
        setReportTitle(title);

        toast({
            title: "تم إنشاء التقرير",
            description: `تم العثور على ${data.length} سجل.`,
        });
    };

    const handleExportPdf = () => {
        if (reportData.length === 0) {
            toast({ variant: 'destructive', title: 'لا توجد بيانات للتصدير' });
            return;
        }

        let headers: string[][] = [];
        let tableData: any[][] = [];

        if (reportType === 'revenue') {
            headers = [['التاريخ', 'الإجمالي', 'الكاش', 'الشبكة', 'الحالة']];
            tableData = reportData.map((rec: RevenueRecord) => [
                formatDate(rec.date),
                formatCurrency(rec.totalRevenue),
                formatCurrency(rec.cash),
                formatCurrency(rec.card),
                rec.status
            ]);
        } else if (reportType === 'expenses') {
            headers = [['التاريخ', 'البند', 'المبلغ', 'الوصف']];
            tableData = reportData.map((exp: Expense) => [
                formatDate(exp.date),
                exp.category,
                formatCurrency(exp.amount),
                exp.description
            ]);
        }
        
        const supervisor = { name: 'المشرف المسؤول' }; 

        try {
          pdfService.generatePDF({
            title: reportTitle,
            type: 'report',
            content: {
                table: { headers, data: tableData }
            },
            userData: userDetails || { name: 'غير معروف', role: 'غير محدد' },
            branchData: {
                name: currentBranch === 'laban' ? 'فرع لبن' : 'فرع طويق',
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

    const renderTable = () => {
        if (reportData.length === 0) {
            return <p className="text-center text-muted-foreground py-10">لا توجد بيانات لعرضها. الرجاء إنشاء تقرير أولاً.</p>;
        }

        if (reportType === 'revenue') {
            return (
                <Table>
                    <TableHeader><TableRow><TableHead>التاريخ</TableHead><TableHead>الإجمالي</TableHead><TableHead>الكاش</TableHead><TableHead>الشبكة</TableHead><TableHead>الحالة</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {reportData.map((rec: RevenueRecord) => (
                            <TableRow key={rec.id}>
                                <TableCell>{formatDate(rec.date)}</TableCell>
                                <TableCell>{formatCurrency(rec.totalRevenue)}</TableCell>
                                <TableCell>{formatCurrency(rec.cash)}</TableCell>
                                <TableCell>{formatCurrency(rec.card)}</TableCell>
                                <TableCell>{rec.status}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            );
        }

        if (reportType === 'expenses') {
             return (
                <Table>
                    <TableHeader><TableRow><TableHead>التاريخ</TableHead><TableHead>البند</TableHead><TableHead>المبلغ</TableHead><TableHead>الوصف</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {reportData.map((exp: Expense) => (
                            <TableRow key={exp.id}>
                                <TableCell>{formatDate(exp.date)}</TableCell>
                                <TableCell>{exp.category}</TableCell>
                                <TableCell>{formatCurrency(exp.amount)}</TableCell>
                                <TableCell>{exp.description}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            );
        }
        return null;
    }

  return (
      <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>إنشاء تقرير مخصص</CardTitle>
                <CardDescription>اختر نوع التقرير والنطاق الزمني لعرض البيانات الخاصة بالفرع الحالي وتصديرها.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4 items-end">
                    <div>
                        <Label htmlFor="report-type">نوع التقرير</Label>
                        <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                            <SelectTrigger id="report-type">
                                <SelectValue placeholder="اختر نوع التقرير" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="revenue">تقرير الإيرادات</SelectItem>
                                <SelectItem value="expenses">تقرير المصروفات</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div>
                        <Label htmlFor="start-date">من تاريخ</Label>
                        <Input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                     <div>
                        <Label htmlFor="end-date">إلى تاريخ</Label>
                        <Input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                </div>
                 <div className="flex justify-end mt-4 gap-2">
                    <Button variant="outline" onClick={handleGenerateReport}>
                        <BarChart2 className="mr-2 h-4 w-4" />
                        عرض التقرير
                    </Button>
                    <Button onClick={handleExportPdf}>
                        <FileDown className="mr-2 h-4 w-4" />
                        تصدير PDF
                    </Button>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>{reportTitle || 'معاينة التقرير'}</CardTitle>
                <CardDescription>هنا تظهر معاينة للبيانات المحددة أعلاه.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="overflow-x-auto">
                    {renderTable()}
                 </div>
            </CardContent>
        </Card>
      </div>
  );
}
