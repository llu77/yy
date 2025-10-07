
'use client'

import { useEffect, useState, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Shield, Plus, History } from 'lucide-react'
import { UserContext, type User, type Role } from '../layout'; // NEW FEATURE: Import from layout
import { useToast } from '@/hooks/use-toast'

// NEW FEATURE: Removed mockUsers and mockLogs, will use context instead.

const ALL_PERMISSIONS = [
  { id: 'dashboard', label: 'لوحة التحكم', description: 'عرض لوحة التحكم الرئيسية' },
  { id: 'salaries', label: 'الرواتب', description: 'إدارة مسيرات الرواتب' },
  { id: 'expenses', label: 'المصروفات', description: 'إدارة المصروفات' },
  { id: 'revenue', label: 'الإيرادات', description: 'إدارة الإيرادات' },
  { id: 'products', label: 'المنتجات', description: 'إدارة المنتجات والمخزون' },
  { id: 'reports', label: 'التقارير', description: 'عرض وتصدير التقارير' },
  { id: 'users_manage', label: 'إدارة المستخدمين', description: 'إضافة وتعديل المستخدمين' },
  { id: 'settings', label: 'الإعدادات', description: 'تعديل إعدادات النظام' },
  { id: 'branches', label: 'الفروع', description: 'إدارة الفروع' },
  { id: 'employees', label: 'الموظفين', description: 'إدارة بيانات الموظفين' }
]

const BRANCHES = ['فرع لبن', 'فرع طويق', 'كافة الفروع']

export default function AdminUsers() {
  // NEW FEATURE: Use UserContext for state management
  const { users, addUser, deleteUser: contextDeleteUser } = useContext(UserContext);
  const [permissionLogs, setPermissionLogs] = useState<any[]>([]) // Kept as local state for now
  const [loading, setLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false)
  const [isLogsDialogOpen, setIsLogsDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()
  const { toast } = useToast();

  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    role: Role;
    branch: string;
  }>({
    name: '',
    email: '',
    role: 'موظف',
    branch: '',
  });


  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault()
    const newUser: User = {
        id: `USR${Date.now()}`,
        ...formData,
    }
    addUser(newUser); // NEW FEATURE: Use context action
    setIsAddDialogOpen(false)
    resetForm()
    toast({ title: "تمت الإضافة", description: `تمت إضافة المستخدم ${newUser.name} بنجاح.`})
  }

  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
      // NOTE: This is a simplified edit. In a real app, you'd call an `updateUser` function from context.
      // For now, it will just close the dialog. Full edit functionality requires more state management.
      console.log("Saving changes for", selectedUser.id, formData);
      setIsEditDialogOpen(false)
      resetForm()
      toast({ title: "تم الحفظ (محاكاة)", description: `تم حفظ التغييرات للمستخدم ${selectedUser.name}.`})
  }

  const handleDeleteUser = (userId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return
      contextDeleteUser(userId); // NEW FEATURE: Use context action
      toast({ variant: "destructive", title: "تم الحذف", description: `تم حذف المستخدم.`})
  }

  const handleToggleStatus = (userId: string) => {
    // This functionality needs an `updateUser` function in the context.
    toast({ title: "غير متاح حالياً", description: "تغيير حالة المستخدم يتطلب تعديلاً في السياق العام."})
  }

  const handleUpdatePermissions = () => {
    if (!selectedUser) return;
    // This functionality needs an `updateUser` function in the context.
    console.log("Updating permissions for", selectedUser.id);
    setIsPermissionsDialogOpen(false);
    resetForm();
    toast({ title: "تم حفظ الصلاحيات (محاكاة)", description: `تم تحديث صلاحيات ${selectedUser.name}.`})
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'موظف',
      branch: '',
    })
    setSelectedUser(null)
  }

  const openEditDialog = (user: User) => {
    setSelectedUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      branch: user.branch,
    })
    setIsEditDialogOpen(true)
  }

  const openPermissionsDialog = (user: User) => {
    setSelectedUser(user)
    setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch,
    })
    setIsPermissionsDialogOpen(true)
  }

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.branch.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'مدير النظام': return 'bg-red-500/20 text-red-500'
      case 'مشرف فرع': return 'bg-blue-500/20 text-blue-500'
      case 'موظف': return 'bg-green-500/20 text-green-500'
      case 'شريك': return 'bg-purple-500/20 text-purple-500'
      default: return 'bg-gray-500/20 text-gray-500'
    }
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white text-xl">جاري التحميل...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">إدارة المستخدمين</h1>
          <p className="text-gray-400">إدارة حسابات المستخدمين والصلاحيات</p>
        </div>

        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="البحث عن مستخدم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <div className='flex gap-2'>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 w-full">
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة مستخدم
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-800 text-white max-w-md border-gray-700">
                <DialogHeader>
                  <DialogTitle className="text-xl">إضافة مستخدم جديد</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddUser}>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto p-4">
                      <div>
                        <Label htmlFor="name">الاسم</Label>
                        <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-gray-700 border-gray-600 text-white" required />
                      </div>
                      <div>
                        <Label htmlFor="email">البريد الإلكتروني</Label>
                        <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="bg-gray-700 border-gray-600 text-white" required />
                      </div>
                      <div>
                        <Label htmlFor="role">الدور</Label>
                        <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as any })}>
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-white"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-gray-700 border-gray-600 text-white">
                            <SelectItem value="مدير النظام">مدير النظام</SelectItem>
                            <SelectItem value="مشرف فرع">مشرف فرع</SelectItem>
                            <SelectItem value="موظف">موظف</SelectItem>
                            <SelectItem value="شريك">شريك</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="branch">الفرع</Label>
                        <Select value={formData.branch} onValueChange={(value) => setFormData({ ...formData, branch: value })}>
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-white"><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
                          <SelectContent className="bg-gray-700 border-gray-600 text-white">
                            {BRANCHES.map(branch => (<SelectItem key={branch} value={branch}>{branch}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  <DialogFooter className="mt-4">
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">إضافة المستخدم</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Button onClick={() => setIsLogsDialogOpen(true)} variant="outline"><History className="w-4 h-4 ml-2" />سجل</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gray-800 border-gray-700 p-4">
            <p className="text-gray-400 text-sm mb-2 text-center">إجمالي المستخدمين</p>
            <p className="text-3xl font-bold text-white text-center">{users.length}</p>
          </Card>
          <Card className="bg-gray-800 border-gray-700 p-4">
            <p className="text-gray-400 text-sm mb-2 text-center">المستخدمون النشطون</p>
            <p className="text-3xl font-bold text-green-500 text-center">{users.length}</p>
          </Card>
          <Card className="bg-gray-800 border-gray-700 p-4">
            <p className="text-gray-400 text-sm mb-2 text-center">المستخدمون غير النشطين</p>
            <p className="text-3xl font-bold text-red-500 text-center">0</p>
          </Card>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-white">قائمة المستخدمين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700 hover:bg-gray-800">
                    <TableHead className="text-gray-400">الاسم</TableHead>
                    <TableHead className="text-gray-400">البريد الإلكتروني</TableHead>
                    <TableHead className="text-gray-400">الدور</TableHead>
                    <TableHead className="text-gray-400">الفرع</TableHead>
                    <TableHead className="text-gray-400">الحالة</TableHead>
                    <TableHead className="text-gray-400">الصلاحيات</TableHead>
                    <TableHead className="text-gray-400">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => (
                    <TableRow key={user.id} className="border-gray-700 hover:bg-gray-700">
                      <TableCell className="text-white">{user.name}</TableCell>
                      <TableCell className="text-gray-300">{user.email}</TableCell>
                      <TableCell><Badge className={getRoleBadgeColor(user.role)}>{user.role}</Badge></TableCell>
                      <TableCell className="text-gray-300">{user.branch}</TableCell>
                      <TableCell>
                        <Button onClick={() => handleToggleStatus(user.id)} className={`h-auto px-2 py-1 text-xs bg-green-500/20 text-green-500 hover:bg-green-500/30`}>
                          نشط
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button onClick={() => openPermissionsDialog(user)} variant={'ghost'} className="text-blue-500 hover:text-blue-400 flex items-center gap-1 p-1 h-auto">
                          <Shield className="w-4 h-4" />
                          إدارة
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button onClick={() => openEditDialog(user)} variant={'ghost'} size={'icon'} className="text-blue-500 hover:text-blue-400 h-8 w-8" title="تعديل"><Edit className="w-4 h-4" /></Button>
                          {user.role !== 'مدير النظام' && (<Button onClick={() => handleDeleteUser(user.id)} variant={'ghost'} size={'icon'} className="text-red-500 hover:text-red-400 h-8 w-8" title="حذف"><Trash2 className="w-4 h-4" /></Button>)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-gray-800 text-white max-w-md border-gray-700">
            <DialogHeader><DialogTitle className="text-xl">تعديل المستخدم</DialogTitle></DialogHeader>
            <form onSubmit={handleEditUser}>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto p-4">
               <div><Label>الاسم</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-gray-700 border-gray-600 text-white" required /></div>
               <div><Label>البريد الإلكتروني</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="bg-gray-700 border-gray-600 text-white" required /></div>
               <div>
                  <Label>الدور</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as any })}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600 text-white">
                        <SelectItem value="مدير النظام">مدير النظام</SelectItem>
                        <SelectItem value="مشرف فرع">مشرف فرع</SelectItem>
                        <SelectItem value="موظف">موظف</SelectItem>
                        <SelectItem value="شريك">شريك</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>الفرع</Label>
                  <Select value={formData.branch} onValueChange={(value) => setFormData({ ...formData, branch: value })}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600 text-white">
                      {BRANCHES.map(branch => (<SelectItem key={branch} value={branch}>{branch}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="mt-4">
               <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">حفظ التغييرات</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Permissions Dialog */}
        <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
            <DialogContent className="bg-gray-800 text-white max-w-2xl border-gray-700">
                <DialogHeader><DialogTitle className="text-xl">إدارة صلاحيات: {selectedUser?.name}</DialogTitle></DialogHeader>
                <div className="space-y-4 max-h-96 overflow-y-auto p-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {ALL_PERMISSIONS.map(permission => (
                    <div key={permission.id} className="flex items-start gap-3 rounded-lg border border-gray-700 p-3 bg-gray-900/50">
                        <input type="checkbox" id={`perm-${permission.id}`} 
                         // This part needs a more complex state management for permissions
                        className="mt-1 h-4 w-4 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500" />
                        <div className="flex-1"><Label htmlFor={`perm-${permission.id}`} className="text-white cursor-pointer">{permission.label}</Label><p className="text-xs text-gray-400">{permission.description}</p></div>
                    </div>
                    ))}
                </div>
                </div>
                <DialogFooter className="!justify-between pt-4 flex-col sm:flex-row gap-2">
                    <div className='flex gap-2'>
                        <Button variant="destructive">إلغاء الكل</Button>
                        <Button variant="outline">تحديد الكل</Button>
                    </div>
                    <Button onClick={handleUpdatePermissions} className="bg-blue-600 hover:bg-blue-700">حفظ الصلاحيات</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>


        {/* Permission Logs Dialog */}
        <Dialog open={isLogsDialogOpen} onOpenChange={setIsLogsDialogOpen}>
          <DialogContent className="bg-gray-800 text-white max-w-3xl border-gray-700">
            <DialogHeader><DialogTitle className="text-xl">سجل تغييرات الصلاحيات</DialogTitle></DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader><TableRow className="border-gray-700 hover:bg-gray-800"><TableHead className="text-gray-400">التاريخ</TableHead><TableHead className="text-gray-400">المستخدم</TableHead><TableHead className="text-gray-400">الإجراء</TableHead><TableHead className="text-gray-400">بواسطة</TableHead></TableRow></TableHeader>
                <TableBody>
                  {permissionLogs.map(log => (
                    <TableRow key={log.id} className="border-gray-700">
                      <TableCell className="text-sm">{log.timestamp}</TableCell>
                      <TableCell className="text-sm">{log.userName}</TableCell>
                      <TableCell><Badge className={'bg-blue-500/20 text-blue-500'}>{log.action}</Badge></TableCell>
                      <TableCell className="text-sm">{log.changedBy}</TableCell>
                    </TableRow>
                  ))}
                   {permissionLogs.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">لا توجد سجلات لعرضها.</TableCell>
                        </TableRow>
                   )}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
    </div>
  )
}

    