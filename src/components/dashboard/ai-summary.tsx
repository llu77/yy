
"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { getFinancialSummary, type FormState } from "@/lib/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wand2 } from "lucide-react";

const initialState: FormState = {
  success: false,
  message: "",
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <Loader2 className="animate-spin" /> : <Wand2 className="mr-2" />}
        {pending ? "جاري الإنشاء..." : "إنشاء ملخص بالذكاء الاصطناعي"}
      </Button>
    );
  }

export function AiSummary() {
  const [state, formAction] = useActionState(getFinancialSummary, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (!state.success && state.message) {
      toast({
        variant: "destructive",
        title: "خطأ في التحقق",
        description: state.message,
      });
    }
  }, [state, toast]);

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Wand2 />
            ملخص مالي بالذكاء الاصطناعي
        </CardTitle>
        <CardDescription>أدخل بياناتك المالية للحصول على ملخص وتحليلات ذكية.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="revenue">إجمالي الإيرادات</Label>
              <Input id="revenue" name="revenue" type="number" placeholder="50000" />
              {state.errors?.revenue && <p className="text-sm text-destructive">{state.errors.revenue[0]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="expenses">إجمالي المصاريف</Label>
              <Input id="expenses" name="expenses" type="number" placeholder="20000" />
              {state.errors?.expenses && <p className="text-sm text-destructive">{state.errors.expenses[0]}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">تاريخ البدء</Label>
              <Input id="startDate" name="startDate" type="date" />
               {state.errors?.startDate && <p className="text-sm text-destructive">{state.errors.startDate[0]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">تاريخ الانتهاء</Label>
              <Input id="endDate" name="endDate" type="date" />
              {state.errors?.endDate && <p className="text-sm text-destructive">{state.errors.endDate[0]}</p>}
            </div>
          </div>
          <SubmitButton />
        </form>

        {state.success && state.data && (
            <div className="mt-6 space-y-4 border-t pt-4">
                <div>
                    <h4 className="font-semibold">الملخص</h4>
                    <p className="text-sm text-muted-foreground">{state.data.summary}</p>
                </div>
                 <div>
                    <h4 className="font-semibold">الرؤى الرئيسية</h4>
                    <p className="text-sm text-muted-foreground">{state.data.keyInsights}</p>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
