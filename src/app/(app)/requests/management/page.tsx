
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Clock, Printer } from "lucide-react";
import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";

type RequestStatus = 'pending' | 'approved' | 'rejected';

type EmployeeRequest = {
    id: string;
    date: string;
    employee: string;
    type: string;
    details: string;
    status: RequestStatus;
};

const initialRequests: EmployeeRequest[] = [
    { id: 'REQ001', date: '2024-05-20', employee: 'محمود عماره', type: 'سلفة', details: 'سلفة بقيمة 500 ريال لأمر طارئ', status: 'approved' },
    { id: 'REQ002', date: '2024-05-18', employee: 'محمد إسماعيل', type: 'إجازة', details: 'طلب إجازة لمدة 3 أيام للسفر', status: 'pending' },
    { id: 'REQ003', date: '2024-05-15', employee: 'عبدالحي', type: 'مستلزمات', details: 'طلب شراء أدوات نظافة جديدة للفرع', status: 'rejected' },
    { id: 'REQ004', date: '2024-05-21', employee: 'علاء ناصر', type: 'استقالة', details: 'طلب استقالة نهائية من العمل', status: 'pending' },
];

const statusMap: { [key in RequestStatus]: { text: string; variant: "secondary" | "default" | "destructive"; icon: React.ElementType } } = {
    pending: { text: "قيد المراجعة", variant: "secondary", icon: Clock },
    approved: { text: "تمت الموافقة", variant: "default", icon: Check },
    rejected: { text: "تم الرفض", variant: "destructive", icon: X },
};

export default function RequestManagementPage() {
    const [requests, setRequests] = useState<EmployeeRequest[]>(initialRequests);
    const [filter, setFilter] = useState('all');
    const { toast } = useToast();

    const handleStatusUpdate = (requestId: string, newStatus: RequestStatus) => {
        setRequests(prevRequests =>
            prevRequests.map(req =>
                req.id === requestId ? { ...req, status: newStatus } : req
            )
        );
        toast({
            title: `تم تحديث حالة الطلب بنجاح`,
            description: `تم ${newStatus === 'approved' ? 'الموافقة على' : 'رفض'} الطلب رقم ${requestId}.`
        });
    };

    const filteredRequests = filter === 'all'
        ? requests
        : requests.filter(req => req.status === filter);

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <CardTitle>إدارة طلبات الموظفين</CardTitle>
                        <CardDescription>مراجعة طلبات الموظفين والموافقة عليها أو رفضها.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>الكل</Button>
                        <Button variant={filter === 'pending' ? 'default' : 'outline'} onClick={() => setFilter('pending')}>قيد المراجعة</Button>
                        <Button variant={filter === 'approved' ? 'default' : 'outline'} onClick={() => setFilter('approved')}>الموافق عليها</Button>
                        <Button variant={filter === 'rejected' ? 'default' : 'outline'} onClick={() => setFilter('rejected')}>المرفوضة</Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>الموظف</TableHead>
                            <TableHead>التاريخ</TableHead>
                            <TableHead>النوع</TableHead>
                            <TableHead>التفاصيل</TableHead>
                            <TableHead>الحالة</TableHead>
                            <TableHead>الإجراء</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRequests.map((req) => {
                            const statusInfo = statusMap[req.status];
                            const StatusIcon = statusInfo.icon;
                            return (
                                <TableRow key={req.id}>
                                    <TableCell>{req.employee}</TableCell>
                                    <TableCell>{req.date}</TableCell>
                                    <TableCell>{req.type}</TableCell>
                                    <TableCell>{req.details}</TableCell>
                                    <TableCell>
                                        <Badge variant={statusInfo.variant} className="gap-1">
                                            <StatusIcon className="h-3 w-3" />
                                            {statusInfo.text}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {req.status === 'pending' && (
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={() => handleStatusUpdate(req.id, 'approved')} className="bg-green-600 hover:bg-green-700"><Check className="h-4 w-4" /></Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(req.id, 'rejected')}><X className="h-4 w-4" /></Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
