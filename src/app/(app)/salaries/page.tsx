
'use client'

import { useEffect, useState, useMemo, useRef, RefObject, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency, formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Check, X, ThumbsUp, ThumbsDown, Printer } from 'lucide-react'
import { UserContext, User, BranchContext } from '../layout' 
import pdfService from '@/services/pdf.service';
import { useAuth } from '@/hooks/use-auth';

type SalaryStatus = 'pending' | 'approved' | 'paid' | 'rejected';

interface SalaryRecord {
  id: number
  date: string
  employeeId: string
  employeeName: string
  branch: string
  basicSalary: number
  deductions: number
  bonuses: number
  netSalary: number
  status: SalaryStatus
  createdBy: string
  createdAt: string
}

const mockSalaries: SalaryRecord[] = [
    { id: 1, date: '2024-07-31', employeeId: 'USR002', employeeName: 'محمود عماره', branch: 'فرع لبن', basicSalary: 4500, deductions: 200, bonuses: 300, netSalary: 4600, status: 'paid', createdBy: 'المدير العام', createdAt: '2024-07-28' },
    { id: 2, date: '2024-07-31', employeeId: 'USR005', employeeName: 'محمد إسماعيل', branch: 'فرع طويق', basicSalary: 6000, deductions: 500, bonuses: 750, netSalary: 6250, status: 'paid', createdBy: 'المدير العام', createdAt: '2024-07-28' },
    { id: 3, date: '2024-08-31', employeeId: 'USR002', employeeName: 'محمود عماره', branch: 'فرع لبن', basicSalary: 4500, deductions: 150, bonuses: 0, netSalary: 4350, status: 'approved', createdBy: 'المدير العام', createdAt: '2024-08-28' },
    { id: 4, date: '2024-08-31', employeeId: 'USR001', employeeName: 'عبدالحي', branch: 'فرع لبن', basicSalary: 4200, deductions: 100, bonuses: 200, netSalary: 4300, status: 'pending', createdBy: 'مشرف فرع', createdAt: '2024-08-29' },
    { id: 5, date: '2024-08-31', employeeId: 'USR004', employeeName: 'السيد', branch: 'فرع لبن', basicSalary: 4300, deductions: 0, bonuses: 150, netSalary: 4450, status: 'pending', createdBy: 'مشرف فرع', createdAt: '2024-08-29' },
    { id: 6, date: '2024-08-31', employeeId: 'USR006', employeeName: 'محمد ناصر', branch: 'فرع طويق', basicSalary: 4800, deductions: 0, bonuses: 400, netSalary: 5200, status: 'pending', createdBy: 'مشرف فرع', createdAt: '2024-08-29' },

];

const getStatusText = (status: SalaryStatus) => {
    switch (status) {
      case 'pending': return 'قيد الانتظار'
      case 'approved': return 'موافق عليه'
      case 'paid': return 'مدفوع'
      case 'rejected': return 'مرفوض'
      default: return status
    }
}

export default function Salaries() {
  const [salaries, setSalaries] = useState<SalaryRecord[]>(mockSalaries)
  const { users } = useContext(UserContext); 
  const { currentBranch } = useContext(BranchContext);
  const { user: authUser, userDetails } = useAuth();
  
  const employeesForBranch = useMemo(() => {
    const branchName = currentBranch === 'laban' ? 'فرع لبن' : 'فرع طويق';
    return users.filter(u => u.branch === branchName && (u.role === 'موظف' || u.role === 'مشرف فرع'));
  }, [users, currentBranch]);

  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    basicSalary: '',
    deductions: '',
    bonuses: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    if (name === 'employeeId') {
      const employee = employeesForBranch.find(emp => emp.id === value)
      if (employee) {
        setFormData(prev => ({
          ...prev,
          employeeId: value,
          basicSalary: '4000' 
        }))
      }
    }
  }

  const calculateNetSalary = () => {
    const basicSalary = parseFloat(formData.basicSalary) || 0
    const deductions = parseFloat(formData.deductions) || 0
    const bonuses = parseFloat(formData.bonuses) || 0
    return basicSalary - deductions + bonuses
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if(!formData.employeeId || !formData.basicSalary) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'الرجاء اختيار الموظف والتأكد من إدخال الراتب الأساسي.'
      })
      return;
    }
    
    setSubmitting(true)
    const employeeDetails = employeesForBranch.find(e => e.id === formData.employeeId);
    const branchName = currentBranch === 'laban' ? 'فرع لبن' : 'فرع طويق';

    const newSalary: SalaryRecord = {
        id: salaries.length + 1,
        date: formData.date,
        employeeId: formData.employeeId,
        employeeName: employeeDetails?.name || 'غير معروف',
        branch: branchName,
        basicSalary: parseFloat(formData.basicSalary),
        deductions: parseFloat(formData.deductions) || 0,
        bonuses: parseFloat(formData.bonuses) || 0,
        netSalary: calculateNetSalary(),
        status: 'pending',
        createdBy: userDetails?.name || 'غير معروف', 
        createdAt: new Date().toISOString()
    };
    setSalaries(prev => [newSalary, ...prev]);
    setFormData({
        employeeId: '',
        date: new Date().toISOString().split('T')[0],
        basicSalary: '',
        deductions: '',
        bonuses: ''
    })
    setSubmitting(false)
    toast({
        title: "تم إضافة مسير الراتب",
        description: "المسير الآن في حالة الانتظار للموافقة.",
        className: "bg-primary text-primary-foreground",
    });
  }

  const handleBulkStatusChange = (newStatus: SalaryStatus) => {
    if(selectedRows.length === 0) return;
    setSalaries(salaries.map(salary => 
      selectedRows.includes(salary.id) ? { ...salary, status: newStatus } : salary
    ));
    setSelectedRows([]);
    toast({
        title: "تم تحديث السجلات بنجاح",
        description: `تم تحديث حالة ${selectedRows.length} سجل إلى "${getStatusText(newStatus)}".`
    });
  };

  const handlePrintSalary = (salary: SalaryRecord) => {
    const employee = users.find(u => u.id === salary.employeeId);
    const supervisor = users.find(u => u.branch === employee?.branch && u.role === 'مشرف فرع');

     try {
       pdfService.generatePDF({
        title: `كشف راتب الموظف: ${salary.employeeName}`,
        type: 'salary',
        content: {
          employees: [{
            name: salary.employeeName,
            idNumber: employee?.id || 'N/A',
            baseSalary: formatCurrency(salary.basicSalary),
            allowances: formatCurrency(salary.bonuses),
            deductions: formatCurrency(salary.deductions),
            netSalary: formatCurrency(salary.netSalary)
          }]
        },
        userData: employee,
        branchData: { name: employee?.branch, supervisorName: supervisor?.name }
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

  const handleBulkPrint = () => {
     const recordsToPrint = selectedRows.length > 0 
        ? salaries.filter(s => selectedRows.includes(s.id))
        : salaries;
    if (recordsToPrint.length === 0) {
      toast({
        variant: 'destructive',
        title: 'لا يوجد شيء للطباعة',
        description: 'الرجاء تحديد سجلات أولاً أو التأكد من وجود سجلات لعرضها.'
      });
      return;
    }
    try {
      pdfService.generatePDF({
          title: `تقرير مسير الرواتب`,
          type: 'salary',
          content: { employees: recordsToPrint },
          userData: userDetails || { name: 'غير معروف', role: 'غير محدد' },
          branchData: { name: "جميع الفروع", supervisorName: "الإدارة" }
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

  const getStatusColor = (status: SalaryStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-500'
      case 'approved': return 'bg-blue-500/20 text-blue-500'
      case 'paid': return 'bg-green-500/20 text-green-500'
      case 'rejected': return 'bg-red-500/20 text-red-500'
      default: return 'bg-gray-500/20 text-gray-500'
    }
  }
  
  const visibleSalaries = useMemo(() => {
      const branchName = currentBranch === 'laban' ? 'فرع لبن' : 'فرع طويق';
      if (userDetails?.role === 'مشرف فرع') {
          return salaries.filter(s => s.branch === userDetails.branch);
      }
      if (userDetails?.role === 'مدير النظام' || userDetails?.role === 'شريك') {
          return salaries.filter(s => s.branch === branchName);
      }
      return [];
  }, [salaries, userDetails, currentBranch]);


  const totalSalaries = visibleSalaries.reduce((sum, salary) => sum + salary.netSalary, 0)
  const totalBasic = visibleSalaries.reduce((sum, salary) => sum + salary.basicSalary, 0)
  const totalDeductions = visibleSalaries.reduce((sum, salary) => sum + salary.deductions, 0)
  const totalBonuses = visibleSalaries.reduce((sum, salary) => sum + salary.bonuses, 0)

  const pendingSalaries = useMemo(() => visibleSalaries.filter(s => s.status === 'pending'), [visibleSalaries]);

  if (!userDetails) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white text-xl">جاري التحميل...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">الرواتب</h1>
            <p className="text-gray-400">إدارة مسيرات الرواتب والمستحقات ودورات الموافقة.</p>
          </div>
          {(userDetails.role === 'مدير النظام') && (
          <Button
            onClick={handleBulkPrint}
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
          >
            <Printer className="ml-2 h-4 w-4" />
            طباعة التقرير الشامل
          </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gray-800 border-gray-700 p-4">
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-2">إجمالي الرواتب</p>
              <p className="text-2xl font-bold text-green-500">
                {formatCurrency(totalSalaries)}
              </p>
            </div>
          </Card>
          <Card className="bg-gray-800 border-gray-700 p-4">
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-2">الرواتب الأساسية</p>
              <p className="text-2xl font-bold text-blue-500">
                {formatCurrency(totalBasic)}
              </p>
            </div>
          </Card>
          <Card className="bg-gray-800 border-gray-700 p-4">
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-2">إجمالي الخصومات</p>
              <p className="text-2xl font-bold text-red-500">
                {formatCurrency(totalDeductions)}
              </p>
            </div>
          </Card>
          <Card className="bg-gray-800 border-gray-700 p-4">
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-2">إجمالي الحوافز</p>
              <p className="text-2xl font-bold text-purple-500">
                {formatCurrency(totalBonuses)}
              </p>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {(userDetails.role === 'مدير النظام' || userDetails.role === 'مشرف فرع') && (
            <Card className="lg:col-span-1 bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">إضافة مسيرة راتب جديدة</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>الموظف</Label>
                    <Select name="employeeId" value={formData.employeeId} onValueChange={(value) => handleInputChange({ target: { name: 'employeeId', value } } as any)} required>
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                            <SelectValue placeholder="اختر الموظف" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 text-white">
                            {employeesForBranch.map((employee) => (
                                <SelectItem key={employee.id} value={employee.id}>
                                {employee.name} - {employee.role}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>التاريخ</Label>
                    <Input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      className="bg-gray-700 border-gray-600"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label>الراتب الأساسي</Label>
                    <Input
                      type="number"
                      name="basicSalary"
                      value={formData.basicSalary}
                      onChange={handleInputChange}
                      className="bg-gray-700 border-gray-600"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className='flex gap-4'>
                    <div>
                      <Label>الخصومات</Label>
                      <Input
                        type="number"
                        name="deductions"
                        value={formData.deductions}
                        onChange={handleInputChange}
                        className="bg-gray-700 border-gray-600"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <Label>الحوافز</Label>
                      <Input
                        type="number"
                        name="bonuses"
                        value={formData.bonuses}
                        onChange={handleInputChange}
                        className="bg-gray-700 border-gray-600"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">الصافي:</span>
                      <span className="text-green-400 font-bold text-lg">
                        {formatCurrency(calculateNetSalary())}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {submitting ? 'جاري الحفظ...' : 'حفظ مسيرة الراتب'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <Card className={userDetails.role === 'موظف' ? 'lg:col-span-3' : 'lg:col-span-2'}>
            <CardHeader>
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <CardTitle className="text-xl font-semibold text-white">مسيرات الرواتب</CardTitle>
                        <CardDescription className="text-gray-400 mt-1">
                            {selectedRows.length > 0 ? `تم تحديد ${selectedRows.length} سجل.` : `يوجد ${pendingSalaries.length} سجل بانتظار الموافقة.`}
                        </CardDescription>
                    </div>
                    {(userDetails.role === 'مدير النظام') && selectedRows.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                            <Button onClick={() => handleBulkStatusChange('approved')} className="bg-green-600 hover:bg-green-700"><ThumbsUp className="mr-2 h-4 w-4" />موافقة</Button>
                            <Button onClick={() => handleBulkStatusChange('rejected')} variant="destructive"><ThumbsDown className="mr-2 h-4 w-4" />رفض</Button>
                            <Button onClick={() => handleBulkStatusChange('paid')} className="bg-blue-600 hover:bg-blue-700"><Check className="mr-2 h-4 w-4" />دفع</Button>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      {userDetails.role === 'مدير النظام' && (
                      <TableHead className="w-10 text-center">
                            <Checkbox
                                checked={selectedRows.length === visibleSalaries.length && visibleSalaries.length > 0}
                                onCheckedChange={(checked) => {
                                    if (checked) {
                                        setSelectedRows(visibleSalaries.map(s => s.id));
                                    } else {
                                        setSelectedRows([]);
                                    }
                                }}
                            />
                      </TableHead>
                      )}
                      <TableHead className="text-gray-400">التاريخ</TableHead>
                      <TableHead className="text-gray-400">الموظف</TableHead>
                      <TableHead className="text-gray-400">الصافي</TableHead>
                      <TableHead className="text-gray-400">الحالة</TableHead>
                      <TableHead className="text-gray-400">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleSalaries.map((salary) => (
                      <TableRow key={salary.id} className="border-gray-700" data-state={selectedRows.includes(salary.id) ? 'selected' : ''}>
                       {userDetails.role === 'مدير النظام' && (
                        <TableCell className="text-center">
                            <Checkbox
                                checked={selectedRows.includes(salary.id)}
                                onCheckedChange={(checked) => {
                                    if (checked) {
                                        setSelectedRows([...selectedRows, salary.id]);
                                    } else {
                                        setSelectedRows(selectedRows.filter(id => id !== salary.id));
                                    }
                                }}
                            />
                        </TableCell>
                        )}
                        <TableCell>{formatDate(salary.date)}</TableCell>
                        <TableCell>{salary.employeeName}</TableCell>
                        <TableCell className="text-green-400 font-medium">
                          {formatCurrency(salary.netSalary)}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(salary.status)}`}>
                            {getStatusText(salary.status)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => handlePrintSalary(salary)}
                            variant="ghost"
                            size="sm"
                            className="text-white hover:bg-gray-700"
                          >
                            طباعة
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  )
}
