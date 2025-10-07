
'use client';
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Utensils, Percent, Bell } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
        title: "تم حفظ الإعدادات",
        description: "تم تحديث إعدادات النظام بنجاح.",
        className: "bg-primary text-primary-foreground",
    });
  };

  return (
    <>
      <Tabs defaultValue="branches" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="branches"><Building2 className="mr-2 h-4 w-4"/>الفروع</TabsTrigger>
          <TabsTrigger value="products"><Utensils className="mr-2 h-4 w-4"/>المنتجات</TabsTrigger>
          <TabsTrigger value="bonuses"><Percent className="mr-2 h-4 w-4"/>البونص والضرائب</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="mr-2 h-4 w-4"/>الإشعارات</TabsTrigger>
        </TabsList>
        
        <div className="mt-6 space-y-6">
            <TabsContent value="branches">
                <Card>
                    <CardHeader>
                        <CardTitle>إدارة الفروع</CardTitle>
                        <CardDescription>إضافة وتعديل معلومات الفروع الخاصة بك.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="border p-4 rounded-lg space-y-2">
                            <Label htmlFor="branch-laban">اسم الفرع</Label>
                            <Input id="branch-laban" defaultValue="فرع لبن" />
                            <Label htmlFor="location-laban">الموقع (رابط خرائط جوجل)</Label>
                            <Input id="location-laban" defaultValue="https://maps.google.com/..." />
                        </div>
                        <div className="border p-4 rounded-lg space-y-2">
                            <Label htmlFor="branch-tuwaiq">اسم الفرع</Label>
                            <Input id="branch-tuwaiq" defaultValue="فرع طويق" />
                            <Label htmlFor="location-tuwaiq">الموقع (رابط خرائط جوجل)</Label>
                            <Input id="location-tuwaiq" defaultValue="https://maps.google.com/..." />
                        </div>
                        <Button variant="outline">إضافة فرع جديد</Button>
                    </CardContent>
                </Card>
            </TabsContent>
            
            <TabsContent value="products">
                 <Card>
                    <CardHeader>
                        <CardTitle>إدارة المنتجات</CardTitle>
                        <CardDescription>تعديل أسعار المنتجات وإضافة منتجات جديدة.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="border p-4 rounded-lg space-y-2">
                            <Label>قهوة مختصة</Label>
                            <Input type="number" defaultValue="15.00" />
                        </div>
                        <div className="border p-4 rounded-lg space-y-2">
                            <Label>شاي كرك</Label>
                            <Input type="number" defaultValue="8.00" />
                        </div>
                        <Button variant="outline">إضافة منتج جديد</Button>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="bonuses">
                 <Card>
                    <CardHeader>
                        <CardTitle>إعدادات البونص والضرائب</CardTitle>
                        <CardDescription>تحكم في نسبة البونص الموزع وقيمة الضريبة المضافة.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="border p-4 rounded-lg space-y-2">
                            <Label htmlFor="bonus-rate">النسبة الافتراضية للبونص من الأرباح (%)</Label>
                            <Input id="bonus-rate" type="number" defaultValue="10" />
                        </div>
                        <div className="border p-4 rounded-lg space-y-2">
                            <Label htmlFor="vat-rate">نسبة ضريبة القيمة المضافة (%)</Label>
                            <Input id="vat-rate" type="number" defaultValue="15" disabled />
                            <p className="text-xs text-muted-foreground">قيمة الضريبة المضافة ثابتة حالياً.</p>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="notifications">
                <Card>
                    <CardHeader>
                        <CardTitle>إعدادات الإشعارات</CardTitle>
                        <CardDescription>تحكم في الإشعارات التي تصلك من النظام.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div>
                                <Label htmlFor="daily-report" className="font-medium">التقرير اليومي</Label>
                                <p className="text-sm text-muted-foreground">إرسال ملخص يومي بالإيرادات والمصاريف في نهاية اليوم.</p>
                            </div>
                            <Switch id="daily-report" defaultChecked />
                        </div>
                         <div className="flex items-center justify-between rounded-lg border p-4">
                            <div>
                                <Label htmlFor="new-request" className="font-medium">الطلبات الجديدة</Label>
                                <p className="text-sm text-muted-foreground">إشعار فوري عند تقديم طلب موظف جديد.</p>
                            </div>
                            <Switch id="new-request" defaultChecked />
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </div>
         <div className="mt-6 flex justify-end">
            <Button size="lg" onClick={handleSave}>حفظ الإعدادات</Button>
        </div>
      </Tabs>
    </>
  );
}
