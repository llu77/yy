
'use client';
import React, { useState, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CirclePlus, ListOrdered, FilePenLine, Trash2, Search, Printer } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { DataContext, BranchContext } from '../layout';
import pdfService from '@/services/pdf.service'; // NEW FEATURE
import { useAuth } from '@/hooks/use-auth'; // NEW FEATURE

export type Expense = {
    id: string;
    date: string;
    branch: string;
    category: string;
    amount: number;
    description: string;
};

// This component is no longer needed as we use the PDF service
// const PrintableExpenses = ({ expenses }: { expenses: Expense[] }) => ( ... );


export default function ExpensesPage() {
  const { expenses, addExpense, deleteExpense } = useContext(DataContext);
  const { userDetails } = useAuth(); // NEW FEATURE
  const { currentBranch } = useContext(BranchContext); // NEW FEATURE
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>(expenses);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  
  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [branch, setBranch] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  
  React.useEffect(() => {
    // Filter by branch for supervisors and employees
    if (userDetails && (userDetails.role === 'مشرف فرع' || userDetails.role === 'موظف')) {
      // Only show expenses from user's branch
      const branchExpenses = expenses.filter(expense => 
        expense.branch === userDetails.branch
      );
      setFilteredExpenses(branchExpenses);
    } else {
      // Admin and partners see all expenses
      setFilteredExpenses(expenses);
    }
  }, [expenses, userDetails]);


  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !branch || !category || !amount || !description) {
        toast({
            variant: "destructive",
            title: "خطأ",
            description: "الرجاء تعبئة جميع الحقول المطلوبة.",
        });
        return;
    }
    // Force correct branch for supervisors and employees
    let correctBranch = branch;
    if (userDetails && (userDetails.role === 'مشرف فرع' || userDetails.role === 'موظف')) {
        // Use user's branch, not the selected one
        correctBranch = userDetails.branch === 'فرع لبن' ? 'laban' : 
                       userDetails.branch === 'فرع طويق' ? 'tuwaiq' : branch;
    }
    
    const newExpense: Omit<Expense, 'id'> = {
        date,
        branch: correctBranch === 'laban' ? 'فرع لبن' : 'فرع طويق',
        category,
        amount: parseFloat(amount),
        description,
    };
    
    const result = await addExpense(newExpense);

    if(result.success) {
      // Reset form
      setDate(new Date().toISOString().split('T')[0]);
      setBranch('');
      setCategory('');
      setAmount('');
      setDescription('');

      toast({
          title: "تم الحفظ بنجاح",
          description: "تمت إضافة المصروف الجديد إلى السجل.",
          className: "bg-primary text-primary-foreground",
      });
    } else {
       toast({
            variant: "destructive",
            title: "فشل الحفظ",
            description: "لم يتم حفظ المصروف بسبب خطأ في الشبكة أو الصلاحيات.",
        });
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    
    // Get base expenses filtered by branch
    let baseExpenses = expenses;
    if (userDetails && (userDetails.role === 'مشرف فرع' || userDetails.role === 'موظف')) {
      baseExpenses = expenses.filter(expense => expense.branch === userDetails.branch);
    }
    
    if (!term) {
        setFilteredExpenses(baseExpenses);
    } else {
        const results = baseExpenses.filter(expense => 
            expense.description.toLowerCase().includes(term.toLowerCase()) ||
            expense.category.toLowerCase().includes(term.toLowerCase()) ||
            expense.branch.toLowerCase().includes(term.toLowerCase())
        );
        setFilteredExpenses(results);
    }
  }

  const handleDelete = (id: string) => {
    deleteExpense(id);
    toast({
        variant: "destructive",
        title: "تم الحذف",
        description: `تم حذف المصروف رقم ${id} من السجل.`,
    });
  }

  const handleEdit = (id: string) => {
    toast({
        title: "غير متاح حالياً",
        description: `ميزة تعديل المصروف ${id} سيتم إضافتها قريباً.`,
    });
  }
  
  // NEW FEATURE: Unified printing using PDF Service
  const handlePrint = () => {
     if (filteredExpenses.length === 0) {
        toast({ variant: 'destructive', title: 'لا توجد بيانات للطباعة' });
        return;
    }

    const tableData = filteredExpenses.map(exp => [
        exp.date,
        exp.branch,
        exp.category,
        exp.amount.toFixed(2) + ' ريال',
        exp.description
    ]);

    const supervisor = { name: 'المشرف المسؤول' }; // Placeholder

    try {
        pdfService.generatePDF({
            title: 'تقرير المصروفات',
            type: 'report',
            content: {
                table: {
                    headers: [['التاريخ', 'الفرع', 'البند', 'المبلغ', 'الوصف']],
                    data: tableData
                }
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
  }


  return (
    <>
      {/* The old printable component is removed */}
      <div className="non-printable">
        <Tabs defaultValue="add-expense" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:w-1/2 lg:w-1/3">
            <TabsTrigger value="add-expense">
              <CirclePlus className="mr-2" />
              إضافة مصروف
            </TabsTrigger>
            <TabsTrigger value="view-expenses">
              <ListOrdered className="mr-2" />
              عرض المصاريف
            </TabsTrigger>
          </TabsList>

          <TabsContent value="add-expense" className="mt-6">
              <Card className="max-w-4xl mx-auto">
                  <CardHeader>
                  <CardTitle>إضافة مصروف جديد</CardTitle>
                  <CardDescription>سجل المصروفات الجديدة للفروع للحفاظ على دقة السجلات المالية.</CardDescription>
                  </CardHeader>
                  <form onSubmit={handleSaveExpense}>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="expense-date">تاريخ المصروف</Label>
                                <Input id="expense-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="expense-branch">الفرع</Label>
                                <Select value={branch} onValueChange={setBranch}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="اختر الفرع" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="laban">فرع لبن</SelectItem>
                                        <SelectItem value="tuwaiq">فرع طويق</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="expense-category">بند المصروف</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر البند" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="بونص ومكافآت">بونص ومكافآت</SelectItem>
                                    <SelectItem value="كهرباء سكن">كهرباء سكن</SelectItem>
                                    <SelectItem value="اثاث/أجهزة ومعدات">اثاث/أجهزة ومعدات</SelectItem>
                                    <SelectItem value="أغراض">أغراض</SelectItem>
                                    <SelectItem value="إنترنت">إنترنت</SelectItem>
                                    <SelectItem value="تذاكر طيران">تذاكر طيران</SelectItem>
                                    <SelectItem value="صيانة">صيانة</SelectItem>
                                    <SelectItem value="احتياجات بسيطة">احتياجات بسيطة</SelectItem>
                                    <SelectItem value="أغراض محل">أغراض محل</SelectItem>
                                    <SelectItem value="رسوم تجديد رخصة/سجل تجاري">رسوم تجديد رخصة/سجل تجاري</SelectItem>
                                    <SelectItem value="طباعه ورق">طباعه ورق</SelectItem>
                                    <SelectItem value="شهاده صحيه">شهاده صحيه</SelectItem>
                                    <SelectItem value="اصدار تأشيرة">اصدار تأشيرة</SelectItem>
                                    <SelectItem value="رسوم حكومية">رسوم حكومية</SelectItem>
                                    <SelectItem value="اصدار/تجديد اقامه">اصدار/تجديد اقامه</SelectItem>
                                    <SelectItem value="تحسينات">تحسينات</SelectItem>
                                    <SelectItem value="ايجار محل">ايجار محل</SelectItem>
                                    <SelectItem value="غسيل سجاد">غسيل سجاد</SelectItem>
                                    <SelectItem value="مخالفة">مخالفة</SelectItem>
                                    <SelectItem value="فحص طبي">فحص طبي</SelectItem>
                                    <SelectItem value="مواصلات">مواصلات</SelectItem>
                                    <SelectItem value="فواتير">فواتير (كهرباء, ماء, انترنت)</SelectItem>
                                    <SelectItem value="رواتب">رواتب</SelectItem>
                                    <SelectItem value="مستلزمات">مستلزمات تشغيلية</SelectItem>
                                    <SelectItem value="إيجار">إيجار</SelectItem>
                                    <SelectItem value="أخرى">أخرى</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="expense-amount">المبلغ (ريال)</Label>
                                <Input id="expense-amount" type="number" placeholder="مثال: 500" value={amount} onChange={e => setAmount(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="expense-description">الوصف / ملاحظات</Label>
                                <Textarea id="expense-description" placeholder="اكتب وصفاً موجزاً للمصروف..." value={description} onChange={e => setDescription(e.target.value)} />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="justify-end">
                        <Button type="submit" size="lg">حفظ المصروف</Button>
                    </CardFooter>
                  </form>
              </Card>
          </TabsContent>
          <TabsContent value="view-expenses" className="mt-6">
            <Card>
                  <CardHeader>
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div>
                              <CardTitle>سجل المصروفات</CardTitle>
                              <CardDescription>عرض وبحث في المصروفات المسجلة.</CardDescription>
                          </div>
                          <div className="flex items-center gap-2 w-full md:w-auto">
                              <div className="relative flex-grow">
                                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input placeholder="ابحث بالوصف أو البند..." className="pr-10" value={searchTerm} onChange={e => handleSearch(e.target.value)}/>
                              </div>
                              <Button variant="outline" size="icon" onClick={handlePrint}>
                                  <Printer className="h-4 w-4" />
                                  <span className="sr-only">طباعة</span>
                              </Button>
                          </div>
                      </div>
                  </CardHeader>
                  <CardContent>
                      <TooltipProvider>
                        <div className="overflow-x-auto">
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead>التاريخ</TableHead>
                                      <TableHead>الفرع</TableHead>
                                      <TableHead>البند</TableHead>
                                      <TableHead>المبلغ</TableHead>
                                      <TableHead>الوصف</TableHead>
                                      <TableHead className="text-left">إجراءات</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {filteredExpenses.length === 0 ? (
                                      <TableRow>
                                          <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                              لا توجد مصروفات لعرضها.
                                          </TableCell>
                                      </TableRow>
                                  ) : (
                                      filteredExpenses.map((expense) => (
                                      <TableRow key={expense.id}>
                                          <TableCell className="whitespace-nowrap">{expense.date}</TableCell>
                                          <TableCell><Badge variant="secondary">{expense.branch}</Badge></TableCell>
                                          <TableCell>{expense.category}</TableCell>
                                          <TableCell className="font-medium whitespace-nowrap">{expense.amount.toFixed(2)} ريال</TableCell>
                                          <TableCell>{expense.description}</TableCell>
                                          <TableCell className="text-left">
                                              <div className="flex gap-1 justify-end">
                                                  <Tooltip>
                                                      <TooltipTrigger asChild>
                                                          <Button variant="ghost" size="icon" onClick={() => handleEdit(expense.id)}><FilePenLine className="h-4 w-4" /></Button>
                                                      </TooltipTrigger>
                                                      <TooltipContent><p>تعديل</p></TooltipContent>
                                                  </Tooltip>
                                                  <Tooltip>
                                                      <TooltipTrigger asChild>
                                                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(expense.id)}><Trash2 className="h-4 w-4" /></Button>
                                                      </TooltipTrigger>
                                                      <TooltipContent><p>حذف</p></TooltipContent>
                                                  </Tooltip>
                                              </div>
                                          </TableCell>
                                      </TableRow>
                                      ))
                                  )}
                              </TableBody>
                          </Table>
                        </div>
                      </TooltipProvider>
                  </CardContent>
              </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
