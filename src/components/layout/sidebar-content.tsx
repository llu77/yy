
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent as UiSidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator
} from "@/components/ui/sidebar";
import { Logo } from "@/components/logo";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Award,
  FileText,
  ShoppingBasket,
  Users,
  BarChart3,
  Settings,
  LogOut,
  WalletCards,
  BrainCircuit,
  ClipboardList, // NEW ICON
  Briefcase, // NEW ICON
  Database, // Data check icon
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

const menuItems = [
  { href: "/", label: "لوحة التحكم", icon: LayoutDashboard, roles: ['مدير النظام', 'مشرف فرع', 'موظف', 'شريك'] },
  { href: "/revenue", label: "الإيرادات", icon: TrendingUp, roles: ['مدير النظام', 'مشرف فرع', 'موظف'] },
  { href: "/expenses", label: "المصاريف", icon: TrendingDown, roles: ['مدير النظام', 'مشرف فرع', 'موظف'] },
  { href: "/bonuses", label: "البونص", icon: Award, roles: ['مدير النظام', 'مشرف فرع'] },
  { href: "/requests/employees", label: "طلبات الموظفين", icon: Briefcase, roles: ['مدير النظام', 'مشرف فرع', 'موظف'] },
  { href: "/requests/products", label: "طلبات المنتجات", icon: ShoppingBasket, roles: ['مدير النظام', 'مشرف فرع'] },
  { href: "/users", label: "إدارة المستخدمين", icon: Users, roles: ['مدير النظام'] },
  { href: "/salaries", label: "الرواتب", icon: WalletCards, roles: ['مدير النظام', 'مشرف فرع'] },
  { href: "/reports", label: "التقارير", icon: BarChart3, roles: ['مدير النظام', 'شريك'] },
  { href: "/accounting-intelligence", label: "الذكاء المحاسبي", icon: BrainCircuit, roles: ['مدير النظام', 'شريك'] },
  { href: "/data-check", label: "فحص البيانات", icon: Database, roles: ['مدير النظام'] },
  { href: "/settings", label: "الإعدادات", icon: Settings, roles: ['مدير النظام'] },
];

export function AppSidebarContent() {
  const pathname = usePathname();
  const { user, userDetails, logout } = useAuth(); // Use userDetails
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const userRole = userDetails?.role;

  const accessibleMenuItems = menuItems.filter(item => {
    if (!userRole) return false;
    // Special case for requests to show a single unified link
    if (item.href === '/requests/employees') {
        return item.roles.includes(userRole);
    }
    // Hide the old management link
    if (item.href === '/requests/management') {
        return false;
    }
    return item.roles.includes(userRole);
  });
  
  // Remove duplicates that might arise from the logic above
  const uniqueMenuItems = accessibleMenuItems.filter((item, index, self) =>
    index === self.findIndex((t) => (
      t.href === item.href
    ))
  );


  return (
    <Sidebar side="right" variant="sidebar" collapsible="icon">
      <div className="flex h-full flex-col">
        <SidebarHeader className="p-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
                <Logo className="group-data-[collapsible=icon]:hidden" />
            </Link>
        </SidebarHeader>
        <UiSidebarContent>
          <SidebarMenu>
            {uniqueMenuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.href) && (item.href !== '/' || pathname === '/')}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                      <item.icon className="ml-2" />
                      <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </UiSidebarContent>
        <SidebarFooter className="p-4">
            <SidebarSeparator />
             <div className="mt-2 text-center text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                <p>&copy; 2024 BranchFlow</p>
                <p>كل الحقوق محفوظة</p>
            </div>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}
