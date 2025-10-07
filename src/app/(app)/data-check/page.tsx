'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Database, Download, Upload } from "lucide-react";

export default function DataCheckPage() {
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [expenseData, setExpenseData] = useState<any[]>([]);
  const [requestsData, setRequestsData] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = () => {
    const revenue = localStorage.getItem('demo_revenue');
    const expenses = localStorage.getItem('demo_expenses');
    const requests = localStorage.getItem('demo_requests');

    setRevenueData(revenue ? JSON.parse(revenue) : []);
    setExpenseData(expenses ? JSON.parse(expenses) : []);
    setRequestsData(requests ? JSON.parse(requests) : []);
  };

  const exportData = () => {
    const allData = {
      revenue: revenueData,
      expenses: expenseData,
      requests: requestsData,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gasah-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "تم التصدير بنجاح",
      description: "تم حفظ نسخة احتياطية من جميع البيانات",
      className: "bg-primary text-primary-foreground",
    });
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        if (data.revenue) {
          localStorage.setItem('demo_revenue', JSON.stringify(data.revenue));
          setRevenueData(data.revenue);
        }
        if (data.expenses) {
          localStorage.setItem('demo_expenses', JSON.stringify(data.expenses));
          setExpenseData(data.expenses);
        }
        if (data.requests) {
          localStorage.setItem('demo_requests', JSON.stringify(data.requests));
          setRequestsData(data.requests);
        }

        toast({
          title: "تم الاستيراد بنجاح",
          description: "تم استعادة جميع البيانات من النسخة الاحتياطية",
          className: "bg-primary text-primary-foreground",
        });
        
        // Reload the page to refresh all data
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "خطأ في الاستيراد",
          description: "تأكد من صحة ملف النسخة الاحتياطية",
        });
      }
    };
    reader.readAsText(file);
  };

  const clearAllData = () => {
    if (confirm('هل أنت متأكد من حذف جميع البيانات؟ هذا الإجراء لا يمكن التراجع عنه!')) {
      localStorage.removeItem('demo_revenue');
      localStorage.removeItem('demo_expenses');
      localStorage.removeItem('demo_requests');
      loadAllData();
      toast({
        variant: "destructive",
        title: "تم حذف البيانات",
        description: "تم حذف جميع البيانات المحلية",
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            فحص البيانات المحفوظة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">الإيرادات</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{revenueData.length}</p>
                <p className="text-sm text-muted-foreground">سجل محفوظ</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">المصروفات</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{expenseData.length}</p>
                <p className="text-sm text-muted-foreground">سجل محفوظ</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">الطلبات</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{requestsData.length}</p>
                <p className="text-sm text-muted-foreground">طلب محفوظ</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <p className="text-sm">
              البيانات محفوظة في متصفحك المحلي. احرص على أخذ نسخة احتياطية بشكل دوري.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={exportData} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              تصدير نسخة احتياطية
            </Button>
            
            <label htmlFor="import-file">
              <Button asChild>
                <span className="flex items-center gap-2 cursor-pointer">
                  <Upload className="h-4 w-4" />
                  استيراد نسخة احتياطية
                </span>
              </Button>
              <input
                id="import-file"
                type="file"
                accept=".json"
                onChange={importData}
                className="hidden"
              />
            </label>

            <Button onClick={loadAllData} variant="outline">
              تحديث البيانات
            </Button>

            <Button onClick={clearAllData} variant="destructive">
              حذف جميع البيانات
            </Button>
          </div>

          {revenueData.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">آخر الإيرادات المسجلة:</h3>
              <div className="space-y-1">
                {revenueData.slice(-3).map((rev, i) => (
                  <div key={i} className="text-sm p-2 bg-muted rounded">
                    {rev.date} - {rev.branch} - {rev.totalRevenue} ريال
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}