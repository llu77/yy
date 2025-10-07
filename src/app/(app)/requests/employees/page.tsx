'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check, X, Clock, CirclePlus, ListOrdered, Printer, Briefcase } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React, { useState, useContext, useMemo, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { UserContext, BranchContext, User, Role, DataContext } from "@/app/(app)/layout";
import ResignationForm from "./ResignationForm"; 
import { useAuth } from "@/hooks/use-auth";
import pdfService from '@/services/pdf.service';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";


export type RequestStatus = 'pending' | 'approved' | 'rejected';

export type EmployeeRequest = {
    id: string;
    date: string;
    employee: string;
    employeeId: string;
    employeeBranch: string;
    type: string;
    details: string;
    status: RequestStatus;
    notes?: string;
};

const statusMap: { [key in RequestStatus]: { text: string; variant: "secondary" | "default" | "destructive"; icon: React.ElementType } } = {
    pending: { text: "قيد المراجعة", variant: "secondary", icon: Clock },
    approved: { text: "تمت الموافقة", variant: "default", icon: Check },
    rejected: { text: "تم الرفض", variant: "destructive", icon: X },
};

const getRequestTypeName = (type: string) => {
    const types: { [key: string]: string } = {
      'resignation': 'طلب استقالة',
      'leave': 'طلب إجازة',
      'advance': 'طلب سلفة',
      'other': 'طلب آخر',
      'سلفة': 'طلب سلفة',
      'إجازة': 'طلب إجازة',
    };
    return types[type] || type;
};

export default function UnifiedRequestsPage() {
    const { toast } = useToast();
    const { users } = useContext(UserContext);
    const { requests, addRequest, updateRequestStatus } = useContext(DataContext);
    const { user: authUser, userDetails } = useAuth();

    // Determine the user's role
    const userRole = userDetails?.role;
    const isManagerOrSupervisor = userRole === 'مدير النظام' || userRole === 'مشرف فرع' || userRole === 'شريك';
    const isEmployee = userRole === 'موظف';
    
    // Allow all users to submit requests (even managers might need to submit requests)
    const canSubmitRequests = true; // Everyone can submit requests
    const canManageRequests = isManagerOrSupervisor;
    
    // Determine the default tab based on the role
    const defaultTab = canManageRequests ? "manage-requests" : "add-request";
    const [activeTab, setActiveTab] = useState(defaultTab);
    
    // Form state for new request (for employees)
    const [requestType, setRequestType] = useState('');
    const [requestDetails, setRequestDetails] = useState('');

    // State for management view
    const [filter, setFilter] = useState('all');

    // Filter requests for the current user (employee)
    const myRequests = useMemo(() => {
        if (!userDetails) return [];
        return requests.filter(r => r.employeeId === userDetails.id);
    }, [requests, userDetails]);

    // Find the supervisor for the current user (for resignation form)
    const supervisor = useMemo(() => {
        if (!userDetails) return null;
        return users.find(u => u.branch === userDetails.branch && u.role === 'مشرف فرع') || null;
    }, [users, userDetails]);

    // Filter requests for the management view
    const visibleRequestsForManagement = useMemo(() => {
        if (!userDetails) return [];

        let reqs = requests;
        if (userRole === 'مشرف فرع') {
            reqs = requests.filter(r => r.employeeBranch === userDetails.branch);
        }
        
        if (filter !== 'all') {
            return reqs.filter(r => r.status === filter);
        }

        return reqs;
    }, [requests, userDetails, filter, userRole]);

    // --- Handlers for Employee View ---
    const handleFormSubmit = async (newRequestData: any) => {
        if(!userDetails) return;

         const newRequest: Omit<EmployeeRequest, 'id'> = {
            date: new Date().toISOString().split('T')[0],
            employee: userDetails.name,
            employeeId: userDetails.id,
            employeeBranch: userDetails.branch,
            status: 'pending', 
            ...newRequestData
        };

        const result = await addRequest(newRequest);

        if (result.success) {
            toast({
                title: "تم إرسال الطلب بنجاح",
                description: "تمت إضافة طلبك إلى القائمة للمراجعة.",
                className: "bg-primary text-primary-foreground",
            });
            resetForm();
            setActiveTab('view-my-requests'); 
        } else {
            toast({
                variant: "destructive",
                title: "فشل الإرسال",
                description: "لم يتم إرسال طلبك بسبب خطأ. الرجاء المحاولة مرة أخرى.",
            });
        }
    };
    
    const resetForm = () => {
        setRequestType('');
        setRequestDetails('');
    };

    const handleSubmitRequest = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!requestType || !requestDetails) {
            toast({
                variant: "destructive",
                title: "خطأ",
                description: "الرجاء تعبئة جميع الحقول لتقديم الطلب.",
            });
            return;
        }

        handleFormSubmit({
            type: requestType,
            details: requestDetails
        });
    };
    
    // --- Handlers for Management View ---
    const handleStatusUpdate = (requestId: string, newStatus: RequestStatus) => {
        const notes = (document.getElementById(`notes-${requestId}`) as HTMLTextAreaElement)?.value || (newStatus === 'approved' ? 'تمت الموافقة' : 'تم الرفض');
        updateRequestStatus(requestId, newStatus, notes);
        toast({
            title: `تم تحديث حالة الطلب بنجاح`,
            description: `تم ${newStatus === 'approved' ? 'الموافقة على' : 'رفض'} الطلب رقم ${requestId}.`
        });
    };

    const handlePrintRequest = (request: EmployeeRequest) => {
        const content = request.type === 'resignation' 
            ? request.details 
            : `نوع الطلب: ${getRequestTypeName(request.type)}\nالموظف: ${request.employee}\nالفرع: ${request.employeeBranch}\nالتاريخ: ${request.date}\nالتفاصيل: ${request.details}\nالحالة: ${statusMap[request.status].text}\nملاحظات: ${request.notes || 'لا يوجد'}`;
            
        const employee = users.find(u => u.id === request.employeeId);
        const supervisor = users.find(u => u.branch === employee?.branch && u.role === 'مشرف فرع');

        try {
          pdfService.generatePDF({
            title: `طلب ${getRequestTypeName(request.type)}`,
            type: 'request',
            content: { text: content },
            userData: employee || { name: 'غير معروف', role: 'غير محدد' },
            branchData: {
                name: employee?.branch,
                supervisorName: supervisor?.name
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

    const handlePrintAllRequests = () => {
        if (visibleRequestsForManagement.length === 0) {
            toast({ variant: 'destructive', title: 'لا توجد طلبات للطباعة' });
            return;
        }

        const tableData = visibleRequestsForManagement.map(req => [
            getRequestTypeName(req.type),
            req.employee,
            req.employeeBranch,
            new Date(req.date).toLocaleDateString('ar-SA'),
            statusMap[req.status].text
        ]);

        const supervisor = users.find(u => u.branch === userDetails?.branch && u.role === 'مشرف فرع');
        
        try {
          pdfService.generatePDF({
            title: 'تقرير الطلبات',
            type: 'report',
            content: {
                table: {
                    headers: [['نوع الطلب', 'الموظف', 'الفرع', 'التاريخ', 'الحالة']],
                    data: tableData
                }
            },
            userData: userDetails || { name: 'غير معروف', role: 'غير محدد' },
            branchData: {
                name: userDetails?.branch,
                supervisorName: supervisor?.name || 'الإدارة'
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

  return (
    <div className="non-printable">
        <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue={defaultTab} className="w-full">
            <TabsList className={`grid w-full ${canManageRequests ? 'grid-cols-3' : 'grid-cols-2'} md:w-auto`}>
                {/* Show request submission tabs for everyone */}
                {canSubmitRequests && (
                    <>
                        <TabsTrigger value="add-request"><CirclePlus className="ms-2" />تقديم طلب</TabsTrigger>
                        <TabsTrigger value="view-my-requests"><ListOrdered className="ms-2" />طلباتي</TabsTrigger>
                    </>
                )}
                {/* Show management tab only for managers/supervisors */}
                {canManageRequests && (
                    <TabsTrigger value="manage-requests"><Briefcase className="ms-2" />إدارة الطلبات</TabsTrigger>
                )}
            </TabsList>

            {/* Employee Tab: Add Request */}
            <TabsContent value="add-request" className="mt-6">
                <Card className="max-w-3xl mx-auto">
                    <CardHeader>
                        <CardTitle>تقديم طلب جديد</CardTitle>
                        <CardDescription>
                            أهلاً بك {userDetails?.name}، يمكنك تقديم طلبك من هنا.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                       <div className="space-y-2 mb-6">
                            <Label htmlFor="request-type">نوع الطلب</Label>
                            <Select value={requestType} onValueChange={setRequestType}>
                                <SelectTrigger><SelectValue placeholder="اختر نوع الطلب" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="resignation">طلب استقالة</SelectItem>
                                    <SelectItem value="advance">سلفة</SelectItem>
                                    <SelectItem value="leave">إجازة</SelectItem>
                                    <SelectItem value="other">طلب آخر</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {requestType === 'resignation' ? (
                            <div className="space-y-4 border-t pt-6">
                                <ResignationForm 
                                    currentUserData={userDetails}
                                    supervisorData={supervisor}
                                    onSubmit={handleFormSubmit} 
                                    onCancel={resetForm} 
                                />
                            </div>
                        ) : requestType !== '' ? (
                           <form onSubmit={handleSubmitRequest} className="space-y-6 border-t pt-6">
                                <div className="space-y-2">
                                    <Label htmlFor="request-details">تفاصيل الطلب</Label>
                                    <Textarea id="request-details" placeholder="اكتب تفاصيل الطلب هنا..." value={requestDetails} onChange={(e) => setRequestDetails(e.target.value)} required />
                                </div>
                                <div className="flex justify-end pt-4">
                                    <Button type="submit" size="lg">إرسال الطلب</Button>
                                </div>
                            </form>
                        ) : null}
                    </CardContent>
                </Card>
            </TabsContent>

            {/* Employee Tab: View My Requests */}
            <TabsContent value="view-my-requests" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>طلباتي</CardTitle>
                        <CardDescription>تابع حالة طلباتك المقدمة.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                        {myRequests.map((req) => {
                            const statusInfo = statusMap[req.status];
                            const StatusIcon = statusInfo.icon;
                            return (
                                <div key={req.id} className="request-card border rounded-lg p-4">
                                     <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="text-lg font-semibold">{getRequestTypeName(req.type)}</h3>
                                            <p className="text-xs text-muted-foreground">بتاريخ: {new Date(req.date).toLocaleDateString('ar-SA')}</p>
                                        </div>
                                        <Badge variant={statusInfo.variant} className="gap-1">
                                            <StatusIcon className="h-3 w-3" />
                                            {statusInfo.text}
                                        </Badge>
                                    </div>
                                    <p className="mb-3 text-sm">{req.details}</p>
                                    {req.notes && <p className="mb-3 p-2 bg-muted rounded-md text-sm"><span className="font-semibold">ملاحظات الإدارة:</span> {req.notes}</p>}
                                </div>
                            );
                        })}
                        </div>
                         {myRequests.length === 0 && (
                            <p className="py-10 text-center text-muted-foreground">لم تقم بتقديم أي طلبات بعد.</p>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            {/* Manager/Supervisor Tab: Manage Requests */}
            <TabsContent value="manage-requests" className="mt-6">
                <Card>
                    <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <CardTitle>إدارة طلبات الموظفين</CardTitle>
                            <CardDescription>مراجعة طلبات الموظفين والموافقة عليها أو رفضها.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="filters flex gap-2 overflow-x-auto pb-2">
                                <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>الكل</Button>
                                <Button size="sm" variant={filter === 'pending' ? 'default' : 'outline'} onClick={() => setFilter('pending')}>قيد المراجعة</Button>
                                <Button size="sm" variant={filter === 'approved' ? 'default' : 'outline'} onClick={() => setFilter('approved')}>الموافق عليها</Button>
                                <Button size="sm" variant={filter === 'rejected' ? 'default' : 'outline'} onClick={() => setFilter('rejected')}>المرفوضة</Button>
                            </div>
                            <Button size="sm" variant="outline" onClick={handlePrintAllRequests}><Printer className="ml-2 h-4 w-4" />طباعة</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                        {visibleRequestsForManagement.map((req) => {
                            const statusInfo = statusMap[req.status];
                            const StatusIcon = statusInfo.icon;
                            return (
                                <div key={req.id} className="request-card border rounded-lg p-4">
                                     <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="text-lg font-semibold">{getRequestTypeName(req.type)}</h3>
                                            <p className="text-sm text-muted-foreground">لـ: {req.employee} ({req.employeeBranch})</p>
                                            <p className="text-xs text-muted-foreground">بتاريخ: {new Date(req.date).toLocaleDateString('ar-SA')}</p>
                                        </div>
                                        <Badge variant={statusInfo.variant} className="gap-1"><StatusIcon className="h-3 w-3" />{statusInfo.text}</Badge>
                                    </div>
                                    <p className="mb-3 text-sm">{req.details}</p>
                                    {req.notes && <p className="mb-3 p-2 bg-muted rounded-md text-sm"><span className="font-semibold">ملاحظات:</span> {req.notes}</p>}
                                    <div className="flex justify-between items-end">
                                        <Button variant="outline" size="sm" onClick={() => handlePrintRequest(req)}><Printer className="mr-2 h-4 w-4" />طباعة الطلب</Button>
                                        {req.status === 'pending' && (
                                            <div className="flex gap-1 justify-end">
                                                <TooltipProvider>
                                                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700" onClick={() => handleStatusUpdate(req.id, 'approved')}><Check className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>موافقة</p></TooltipContent></Tooltip>
                                                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => handleStatusUpdate(req.id, 'rejected')}><X className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>رفض</p></TooltipContent></Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        )}
                                    </div>
                                    {req.status === 'pending' && (
                                        <div className="admin-actions mt-4 p-3 bg-muted/50 rounded">
                                            <Label htmlFor={`notes-${req.id}`} className="mb-2 block text-xs font-medium">ملاحظات على القرار (اختياري)</Label>
                                            <Textarea id={`notes-${req.id}`} placeholder="أضف ملاحظات على القرار..." rows={2}/>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        </div>
                         {visibleRequestsForManagement.length === 0 && (
                            <p className="py-10 text-center text-muted-foreground">لا توجد طلبات لعرضها تطابق الفلتر الحالي.</p>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </div>
  );
}
