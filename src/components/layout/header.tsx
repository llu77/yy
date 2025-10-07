
"use client";

import React, { useContext } from 'react';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, User, Building, BrainCircuit } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { usePathname, useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BranchContext } from '@/app/(app)/layout';


function getPageTitle(pathname: string) {
    if (pathname === '/') return 'لوحة التحكم';
    if (pathname.startsWith('/revenue')) return 'الإيرادات';
    if (pathname.startsWith('/expenses')) return 'المصاريف';
    if (pathname.startsWith('/bonuses')) return 'البونص';
    if (pathname.startsWith('/requests/employees')) return 'طلبات الموظفين';
    if (pathname.startsWith('/requests/products')) return 'طلبات المنتجات';
    if (pathname.startsWith('/users')) return 'إدارة المستخدمين';
    if (pathname.startsWith('/salaries')) return 'مسيرات الرواتب';
    if (pathname.startsWith('/reports')) return 'التقارير';
    if (pathname.startsWith('/accounting-intelligence')) return 'الذكاء المحاسبي';
    if (pathname.startsWith('/settings')) return 'الإعدادات';
    return 'BranchFlow';
}


export function Header() {
  const { user, userDetails, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const { currentBranch, setCurrentBranch } = useContext(BranchContext);


  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
      <SidebarTrigger className="md:hidden" />
      <div className="w-full flex-1">
        <h1 className="text-lg font-semibold md:text-2xl">{pageTitle}</h1>
      </div>

       <div className="flex items-center gap-2 md:gap-4">
       {/* Only show branch selector for system admin and partners */}
       {(userDetails?.role === 'مدير النظام' || userDetails?.role === 'شريك') && (
        <div className="w-36 md:w-48">
            <Select value={currentBranch} onValueChange={setCurrentBranch}>
                <SelectTrigger className="w-full bg-secondary border-secondary-border">
                    <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground hidden md:block" />
                        <SelectValue placeholder="اختر الفرع..." />
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="laban">فرع لبن</SelectItem>
                    <SelectItem value="tuwaiq">فرع طويق</SelectItem>
                </SelectContent>
            </Select>
        </div>
       )}
       
       {/* Show fixed branch name for supervisors and employees */}
       {(userDetails?.role === 'مشرف فرع' || userDetails?.role === 'موظف') && (
        <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-md">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{userDetails.branch}</span>
        </div>
       )}

        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2 md:px-3">
                     <div className="flex flex-col items-end">
                        <span className="font-semibold text-sm">{userDetails?.name}</span>
                        <span className="text-xs text-muted-foreground">{userDetails?.role}</span>
                    </div>
                    <User className="h-5 w-5 text-primary" />
                    <span className="sr-only">Toggle user menu</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user?.displayName || user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                <User className="ml-2 h-4 w-4" />
                <span>الملف الشخصي</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="ml-2 h-4 w-4" />
                <span>تسجيل الخروج</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
