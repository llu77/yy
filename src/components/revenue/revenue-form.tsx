
"use client";

import React, { useContext, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, MinusCircle, PlusCircle, Save } from "lucide-react";
import { UserContext, BranchContext } from "@/app/(app)/layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RevenueRecord } from "./revenue-table";


const revenueFormSchema = z.object({
    date: z.string({ required_error: "التاريخ مطلوب" }).min(1, "التاريخ مطلوب"),
    totalRevenue: z.coerce.number({ required_error: "إجمالي الإيرادات مطلوب" }).positive("إجمالي الإيرادات يجب أن يكون رقمًا موجبًا"),
    cash: z.coerce.number({ required_error: "مبلغ الكاش مطلوب" }).min(0, "مبلغ الكاش لا يمكن أن يكون سالبًا"),
    card: z.coerce.number({ required_error: "مبلغ الشبكة مطلوب" }).min(0, "مبلغ الشبكة لا يمكن أن يكون سالبًا"),
    distribution: z.array(
        z.object({
            employeeName: z.string().min(1, "اسم الموظف مطلوب"),
            amount: z.coerce.number().positive("المبلغ يجب أن يكون رقمًا موجبًا"),
        })
    ).min(1, "يجب توزيع الإيراد على موظف واحد على الأقل.").max(5, "يمكن توزيع الإيراد على 5 موظفين كحد أقصى."),
    discrepancyReason: z.string().optional(),
})
.refine(data => {
    const isMismatched = Math.abs((data.cash + data.card) - data.totalRevenue) > 0.01;
    return !isMismatched || (isMismatched && data.discrepancyReason && data.discrepancyReason.trim().length > 0);
}, {
    message: "يجب كتابة سبب في حال عدم تطابق المجموع مع (الكاش + الشبكة)",
    path: ["discrepancyReason"],
})
.refine(data => {
    const distributedTotal = data.distribution.reduce((acc, dist) => acc + (dist.amount || 0), 0);
    return Math.abs(distributedTotal - data.totalRevenue) < 0.01;
}, {
    message: "مجموع المبالغ الموزعة يجب أن يساوي إجمالي الإيرادات",
    path: ["distribution"],
});

type RevenueFormValues = z.infer<typeof revenueFormSchema>;

interface RevenueFormProps {
    onSave: (data: Omit<RevenueRecord, 'id' | 'status' | 'branch'>, branch: string) => Promise<boolean>;
}


export function RevenueForm({ onSave }: RevenueFormProps) {
    const { users } = useContext(UserContext);
    const { currentBranch } = useContext(BranchContext);

    const branchEmployees = useMemo(() => {
        const branchName = currentBranch === 'laban' ? 'فرع لبن' : 'فرع طويق';
        return users.filter(u => u.branch === branchName && (u.role === 'موظف' || u.role === 'مشرف فرع'));
    }, [users, currentBranch]);


    const form = useForm<RevenueFormValues>({
        resolver: zodResolver(revenueFormSchema),
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            totalRevenue: '' as unknown as number,
            cash: '' as unknown as number,
            card: '' as unknown as number,
            distribution: [{ employeeName: "", amount: 0 }],
            discrepancyReason: "",
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "distribution",
    });

    const watchFields = form.watch(["totalRevenue", "cash", "card", "distribution"]);
    const [totalRevenue, cash, card, distribution] = watchFields;

    const isRevenueMismatched = React.useMemo(() => 
        (Number(totalRevenue) > 0) && Math.abs((Number(cash) + Number(card)) - Number(totalRevenue)) > 0.01,
        [totalRevenue, cash, card]
    );

    const distributedTotal = React.useMemo(() => 
        distribution.reduce((acc, dist) => acc + (Number(dist.amount) || 0), 0),
        [distribution]
    );
    
    const isDistributionUnbalanced = React.useMemo(() =>
        Number(totalRevenue) > 0 && Math.abs(distributedTotal - Number(totalRevenue)) > 0.01,
        [totalRevenue, distributedTotal]
    );

    const onSubmit: SubmitHandler<RevenueFormValues> = async (data) => {
        const success = await onSave(data, currentBranch);
        if (success) {
            form.reset();
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>بيانات الإيراد الأساسية</CardTitle>
                        <CardDescription>أدخل تفاصيل الإيرادات اليومية وطريقة الدفع.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <FormField control={form.control} name="date" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>التاريخ</FormLabel>
                                    <FormControl><Input type="date" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="totalRevenue" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>إجمالي الإيرادات</FormLabel>
                                    <FormControl><Input type="number" placeholder="3000" {...field} value={field.value ?? ''} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="cash" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>الكاش</FormLabel>
                                    <FormControl><Input type="number" placeholder="1000" {...field} value={field.value ?? ''} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="card" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>الشبكة</FormLabel>
                                    <FormControl><Input type="number" placeholder="2000" {...field} value={field.value ?? ''} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        {isRevenueMismatched && (
                            <FormField control={form.control} name="discrepancyReason" render={({ field }) => (
                                <FormItem className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                                    <FormLabel className="flex items-center gap-2 text-destructive">
                                        <AlertTriangle size={16} />
                                        <span>سبب عدم تطابق الإجمالي</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="مثال: يوجد مبلغ 50 ريال فائض..." {...field} className="bg-card"/>
                                    </FormControl>
                                    <FormDescription>مجموع الكاش والشبكة لا يساوي إجمالي الإيرادات. يرجى توضيح السبب.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>توزيع الإيرادات على الموظفين</CardTitle>
                        <CardDescription>قم بتوزيع إجمالي الإيراد على الموظفين العاملين في الوردية.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         {fields.map((field, index) => (
                            <div key={field.id} className="flex flex-col gap-4 rounded-md border p-4 md:flex-row md:items-end">
                                <FormField
                                    control={form.control}
                                    name={`distribution.${index}.employeeName`}
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                        <FormLabel>اسم الموظف</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="اختر الموظف" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {branchEmployees.map(user => (
                                                        <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField control={form.control} name={`distribution.${index}.amount`} render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel>المبلغ المستلم</FormLabel>
                                        <FormControl><Input type="number" placeholder="1500" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10 hover:text-destructive md:mb-1">
                                    <MinusCircle size={20} />
                                </Button>
                            </div>
                        ))}
                        
                        {fields.length < 5 && (
                            <Button type="button" variant="outline" onClick={() => append({ employeeName: "", amount: 0 })}>
                                <PlusCircle className="mr-2" />
                                إضافة موظف آخر
                            </Button>
                        )}
                        
                        {form.formState.errors.distribution?.root && (
                            <p className="mt-2 text-sm font-medium text-destructive">{form.formState.errors.distribution.root.message}</p>
                        )}

                        {isDistributionUnbalanced && (
                            <div className="mt-4 flex items-center gap-2 text-sm text-destructive">
                                <AlertTriangle size={16} />
                                <span>
                                    المجموع الموزع ({distributedTotal.toFixed(2)} ريال) لا يساوي إجمالي الإيرادات ({(typeof totalRevenue === 'number' ? Number(totalRevenue) : 0).toFixed(2)} ريال).
                                    الفرق: {(distributedTotal - (typeof totalRevenue === 'number' ? Number(totalRevenue) : 0)).toFixed(2)} ريال
                                </span>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="justify-end">
                        <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                            <Save className="mr-2" />
                            {form.formState.isSubmitting ? 'جاري الحفظ...' : 'حفظ الإيرادات'}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
}
