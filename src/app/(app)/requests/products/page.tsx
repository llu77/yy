
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CirclePlus, Printer, Trash2, Search, ShoppingCart } from "lucide-react";
import React, { useState, useMemo, useContext, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { UserContext, BranchContext } from "@/app/(app)/layout";
import { useAuth } from "@/hooks/use-auth";
import { Separator } from "@/components/ui/separator";

// --- Data ---
const initialProducts = [
    { id: 'PROD01', name: 'ماسك شعر كيراتين بروتين 1000مل', price: 35, category: 'متنوعات' },
    { id: 'PROD02', name: 'كريم بعد الحلاقة 400مل', price: 20, category: 'متنوعات' },
    { id: 'PROD03', name: 'قطن', price: 3, category: 'متنوعات' },
    { id: 'PROD04', name: 'بلاديكس أمواس أزرق', price: 24, category: 'متنوعات' },
    { id: 'PROD05', name: 'مناشف استخدام مره واحده 50*100', price: 21, category: 'متنوعات' },
    { id: 'PROD06', name: 'واكس سيستم أعود خشبيه 50حبه', price: 3, category: 'متنوعات' },
    { id: 'PROD07', name: 'أعواد قطن أزرق', price: 4, category: 'متنوعات' },
    { id: 'PROD08', name: 'فاتيكا كريم شعر', price: 5, category: 'متنوعات' },
    { id: 'PROD09', name: 'فرشة شعر', price: 10, category: 'متنوعات' },
    { id: 'PROD10', name: 'شمع بابلو أسود أو أزرق', price: 41, category: 'متنوعات' },
    { id: 'PROD11', name: 'مريله بلاستك اصفر', price: 41, category: 'متنوعات' },
    { id: 'PROD12', name: 'بلاتينا منادیل ورقيه', price: 35, category: 'متنوعات' },
    { id: 'PROD13', name: 'ورق رقبه', price: 10, category: 'متنوعات' },
    { id: 'PROD14', name: 'كمامه وجه اسود', price: 2, category: 'متنوعات' },
    { id: 'PROD15', name: 'قفازات فينيل بدون بودره اسود', price: 9, category: 'متنوعات' },
    { id: 'PROD16', name: 'ليمون للوجه', price: 3, category: 'متنوعات' },
    { id: 'PROD17', name: 'صبغة شعر بني غامق', price: 12, category: 'متنوعات' },
    { id: 'PROD18', name: 'صبغة دقن اسود', price: 15, category: 'متنوعات' },
    { id: 'PROD19', name: 'حنة شعر اسود', price: 4, category: 'متنوعات' },
    { id: 'PROD20', name: 'لاصق انف', price: 5, category: 'متنوعات' },
    { id: 'PROD21', name: 'كريم أطراف شعر بعد الحلاقة', price: 5, category: 'متنوعات' },
    { id: 'PROD22', name: 'مناشف منعشه 25', price: 12, category: 'متنوعات' },
    { id: 'PROD23', name: 'جل حلاقة 1 لتر', price: 11, category: 'متنوعات' },
    { id: 'PROD24', name: 'قناع طين', price: 11, category: 'متنوعات' },
    { id: 'PROD25', name: 'قناع فحم', price: 11, category: 'متنوعات' },
    { id: 'PROD26', name: 'صنفره وجه بالنعناع', price: 11, category: 'متنوعات' },
    { id: 'PROD27', name: 'صنفره وجه بالقهوه', price: 11, category: 'متنوعات' },
    { id: 'PROD28', name: 'صنفره وجه الخيار', price: 11, category: 'متنوعات' },
    { id: 'PROD29', name: 'صنفره وجه', price: 11, category: 'متنوعات' },
    { id: 'PROD30', name: 'اكياس نفايات اسود 60 جالون', price: 11, category: 'متنوعات' },
    { id: 'PROD31', name: 'اكياس نفايات اصفر 8/10 جالون', price: 7, category: 'متنوعات' },
    { id: 'PROD32', name: 'مكنسه للارضيات', price: 15, category: 'متنوعات' },
    { id: 'PROD33', name: 'مساحه بلاط/ارضيات', price: 25, category: 'متنوعات' },
    { id: 'PROD34', name: 'ديتول للارضيات', price: 15, category: 'متنوعات' },
    { id: 'PROD35', name: 'ملمع بلاط', price: 15, category: 'متنوعات' },
    { id: 'PROD36', name: 'بخاخ تنظيف زجاج', price: 11, category: 'متنوعات' },
    { id: 'PROD37', name: 'معطر جو 500 مل', price: 150, category: 'متنوعات' },
    { id: 'PROD38', name: 'كلونيا', price: 2, category: 'متنوعات' },
    { id: 'PROD39', name: 'شفاء كرات قطن', price: 3, category: 'متنوعات' },
    { id: 'PROD40', name: 'سفنج لتنظيف البشرة 12حبه', price: 9, category: 'متنوعات' },
    { id: 'PROD41', name: 'واكس للشعر بلمز او شمع', price: 27, category: 'متنوعات' },
    { id: 'PROD42', name: 'منادیل رول نظافه', price: 8, category: 'متنوعات' },
    { id: 'PROD43', name: 'منادیل بلاتينا 600 حبه', price: 34, category: 'متنوعات' },
    { id: 'PROD44', name: 'فرشه استشوار', price: 15, category: 'متنوعات' },
    { id: 'PROD45', name: 'مقص مقاس 6', price: 20, category: 'متنوعات' },
    { id: 'PROD46', name: 'مقص مقاس 5.5', price: 20, category: 'متنوعات' },
    { id: 'PROD47', name: 'كمامات', price: 7, category: 'متنوعات' },
    { id: 'PROD48', name: 'مريله أصغر * كرتون', price: 20, category: 'متنوعات' },
    { id: 'PROD49', name: 'لمبه جهاز تعقيم', price: 20, category: 'متنوعات' },
    { id: 'PROD50', name: 'بروتين للشعر', price: 350, category: 'متنوعات' },
    { id: 'PROD51', name: 'ماكينه تنعيم', price: 50, category: 'متنوعات' },
    { id: 'PROD52', name: 'شامبو فاتيكا 600 مل', price: 16, category: 'متنوعات' }
];

type Product = Omit<typeof initialProducts[0], 'image'>;
type CartItem = {
    product: Product;
    quantity: number;
};

// --- Invoice Component ---
const Invoice = ({ cart, total }: { cart: CartItem[], total: number }) => {
    const { currentBranch } = useContext(BranchContext);
    const { user } = useAuth();
    const branchName = currentBranch === 'laban' ? 'فرع لبن' : 'فرع طويق';
    const today = new Date().toLocaleDateString('ar-SA');
    const vat = total * 0.15;
    const grandTotal = total + vat;

    return (
        <div className="printable-content p-6 bg-card text-card-foreground rounded-lg border">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-primary">فاتورة طلبات ضريبية مبسطة</h2>
                <p className="text-sm text-muted-foreground">{branchName}</p>
            </div>
            <div className="flex justify-between text-sm mb-4">
                <span><span className="font-semibold">الموظف:</span> {user?.displayName || "غير محدد"}</span>
                <span><span className="font-semibold">التاريخ:</span> {today}</span>
            </div>
            <Separator className="my-4"/>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>المنتج</TableHead>
                        <TableHead className="text-center">الكمية</TableHead>
                        <TableHead className="text-right">الإجمالي</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {cart.map(item => (
                        <TableRow key={item.product.id}>
                            <TableCell>{item.product.name}</TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right font-mono">{(item.product.price * item.quantity).toFixed(2)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <Separator className="my-4"/>
            <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">الإجمالي الفرعي</span>
                    <span className="font-semibold font-mono">{total.toFixed(2)} ريال</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">ضريبة القيمة المضافة (15%)</span>
                    <span className="font-semibold font-mono">{vat.toFixed(2)} ريال</span>
                </div>
                 <Separator className="my-2"/>
                <div className="flex justify-between items-center text-lg font-bold text-primary">
                    <span>الإجمالي للدفع</span>
                    <span className="font-mono">{grandTotal.toFixed(2)} ريال</span>
                </div>
            </div>
        </div>
    );
};

// --- Main Page Component ---
export default function ProductRequestsPage() {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();
    
    const filteredProducts = useMemo(() => {
        return initialProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [searchTerm]);

    const handleAddToCart = (product: Product) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.product.id === product.id);
            if (existingItem) {
                return prevCart.map(item =>
                    item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevCart, { product, quantity: 1 }];
        });
    };
    
    const handleRemoveFromCart = (productId: string) => {
        setCart(cart.filter(item => item.product.id !== productId));
    };

    const handleUpdateQuantity = (productId: string, newQuantity: number) => {
        if (newQuantity < 1) {
            handleRemoveFromCart(productId);
            return;
        }
        setCart(cart.map(item => item.product.id === productId ? { ...item, quantity: newQuantity } : item));
    };
    
    const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    const handlePrint = () => {
        window.print();
    };

    const handleClearCart = () => {
        setCart([]);
        toast({
            variant: "destructive",
            title: "تم إلغاء فاتورة الطلبات",
            description: "تم مسح جميع المنتجات من السلة.",
        });
    }

    return (
        <div className="grid lg:grid-cols-2 gap-6">
            {/* Left Side: Invoice and Actions */}
            <div className="flex flex-col gap-6">
                <Card>
                    <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <CardTitle>فاتورة الطلبات الحالية</CardTitle>
                            <CardDescription>إجمالي {cart.length} منتجات</CardDescription>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                            <Button size="lg" disabled={cart.length === 0} onClick={handlePrint}>
                                <Printer className="mr-2 h-4 w-4" />
                                طباعة
                            </Button>
                            <Button variant="destructive" size="lg" disabled={cart.length === 0} onClick={handleClearCart}>
                                إلغاء
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
                                <ShoppingCart className="h-12 w-12 mb-4" />
                                <h3 className="text-lg font-semibold">فاتورة الطلبات فارغة</h3>
                                <p>أضف منتجات من القائمة لبدء فاتورة جديدة.</p>
                            </div>
                        ) : (
                            <Invoice cart={cart} total={total} />
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Right Side: Products List */}
            <div className="md:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle>قائمة المنتجات</CardTitle>
                        <div className="relative mt-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="ابحث عن منتج..." 
                                className="pl-10" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto p-4">
                        {filteredProducts.map(product => (
                            <div key={product.id} className="flex items-center gap-4 p-2 border rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex-grow">
                                    <h4 className="font-semibold">{product.name}</h4>
                                    <p className="text-sm text-muted-foreground">{product.price.toFixed(2)} ريال</p>
                                </div>
                                <Button size="icon" variant="outline" onClick={() => handleAddToCart(product)}>
                                    <CirclePlus className="h-5 w-5 text-primary" />
                                </Button>
                            </div>
                        ))}
                            {filteredProducts.length === 0 && (
                            <p className="text-center text-muted-foreground py-4">لا توجد منتجات تطابق بحثك.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
