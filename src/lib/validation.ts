import { z } from 'zod';

// Arabic text validation - allows Arabic letters, numbers, and common punctuation
const arabicTextRegex = /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s\d\-\_\.\,\(\)]+$/;

// Email validation with additional security checks
const emailSchema = z.string()
  .email('البريد الإلكتروني غير صالح')
  .min(5, 'البريد الإلكتروني قصير جداً')
  .max(254, 'البريد الإلكتروني طويل جداً')
  .refine(email => !email.includes('..'), 'البريد الإلكتروني يحتوي على نقاط متتالية')
  .refine(email => !email.startsWith('.'), 'البريد الإلكتروني لا يمكن أن يبدأ بنقطة')
  .refine(email => !email.endsWith('.'), 'البريد الإلكتروني لا يمكن أن ينتهي بنقطة');

// User validation schemas
export const userSchema = z.object({
  name: z.string()
    .min(2, 'الاسم قصير جداً')
    .max(100, 'الاسم طويل جداً')
    .refine(name => arabicTextRegex.test(name), 'الاسم يجب أن يحتوي على أحرف عربية فقط'),
  email: emailSchema,
  role: z.enum(['مدير النظام', 'مشرف فرع', 'موظف', 'شريك'], {
    errorMap: () => ({ message: 'الدور غير صالح' })
  }),
  branch: z.enum(['كافة الفروع', 'فرع لبن', 'فرع طويق'], {
    errorMap: () => ({ message: 'الفرع غير صالح' })
  }),
  isActive: z.boolean().optional()
});

// Revenue validation schema
export const revenueSchema = z.object({
  date: z.string().datetime('التاريخ غير صالح'),
  branch: z.enum(['فرع لبن', 'فرع طويق'], {
    errorMap: () => ({ message: 'الفرع غير صالح' })
  }),
  totalRevenue: z.number()
    .min(0, 'الإيراد الإجمالي لا يمكن أن يكون سالباً')
    .max(1000000, 'الإيراد الإجمالي كبير جداً'),
  cash: z.number()
    .min(0, 'المبلغ النقدي لا يمكن أن يكون سالباً')
    .max(1000000, 'المبلغ النقدي كبير جداً'),
  card: z.number()
    .min(0, 'مبلغ البطاقة لا يمكن أن يكون سالباً')
    .max(1000000, 'مبلغ البطاقة كبير جداً'),
  distribution: z.array(z.object({
    name: z.string().min(1, 'اسم التوزيع مطلوب'),
    percentage: z.number()
      .min(0, 'النسبة المئوية لا يمكن أن تكون سالبة')
      .max(100, 'النسبة المئوية لا يمكن أن تتجاوز 100'),
    amount: z.number()
      .min(0, 'المبلغ لا يمكن أن يكون سالباً')
      .optional()
  })).optional(),
  status: z.enum(['Matched', 'Discrepancy', 'Unbalanced']).optional(),
  notes: z.string().max(500, 'الملاحظات طويلة جداً').optional()
}).refine(data => {
  // Validate that cash + card equals totalRevenue
  const tolerance = 0.01; // Allow small rounding differences
  return Math.abs((data.cash + data.card) - data.totalRevenue) <= tolerance;
}, {
  message: 'مجموع النقدي والبطاقة يجب أن يساوي الإيراد الإجمالي',
  path: ['totalRevenue']
});

// Expense validation schema
export const expenseSchema = z.object({
  date: z.string().datetime('التاريخ غير صالح'),
  branch: z.enum(['فرع لبن', 'فرع طويق'], {
    errorMap: () => ({ message: 'الفرع غير صالح' })
  }),
  category: z.enum([
    'رواتب',
    'إيجار',
    'مرافق',
    'صيانة',
    'مشتريات',
    'تسويق',
    'نقل',
    'أخرى'
  ], {
    errorMap: () => ({ message: 'الفئة غير صالحة' })
  }),
  amount: z.number()
    .positive('المبلغ يجب أن يكون موجباً')
    .max(1000000, 'المبلغ كبير جداً'),
  description: z.string()
    .min(3, 'الوصف قصير جداً')
    .max(500, 'الوصف طويل جداً')
    .refine(desc => !desc.includes('<script'), 'الوصف يحتوي على محتوى غير مسموح'),
  paymentMethod: z.enum(['نقدي', 'بطاقة', 'تحويل بنكي'], {
    errorMap: () => ({ message: 'طريقة الدفع غير صالحة' })
  }).optional(),
  receiptNumber: z.string()
    .max(50, 'رقم الإيصال طويل جداً')
    .optional(),
  supplier: z.string()
    .max(100, 'اسم المورد طويل جداً')
    .optional()
});

// Request validation schema
export const requestSchema = z.object({
  type: z.enum(['استقالة', 'تأمين', 'كفالة', 'سلفة', 'راتب', 'أخرى'], {
    errorMap: () => ({ message: 'نوع الطلب غير صالح' })
  }),
  employeeId: z.string().min(1, 'معرف الموظف مطلوب'),
  employeeName: z.string()
    .min(2, 'اسم الموظف قصير جداً')
    .max(100, 'اسم الموظف طويل جداً'),
  employeeBranch: z.enum(['فرع لبن', 'فرع طويق'], {
    errorMap: () => ({ message: 'فرع الموظف غير صالح' })
  }),
  date: z.string().datetime('التاريخ غير صالح'),
  status: z.enum(['مُعلق', 'مُوافق عليه', 'مرفوض'], {
    errorMap: () => ({ message: 'حالة الطلب غير صالحة' })
  }),
  details: z.string()
    .max(1000, 'التفاصيل طويلة جداً')
    .optional(),
  amount: z.number()
    .positive('المبلغ يجب أن يكون موجباً')
    .max(100000, 'المبلغ كبير جداً')
    .optional(),
  notes: z.string()
    .max(500, 'الملاحظات طويلة جداً')
    .optional()
});

// Login validation schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string()
    .min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل')
    .max(128, 'كلمة المرور طويلة جداً')
});

// Sanitization functions
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

export function sanitizeNumber(input: any): number {
  const num = Number(input);
  if (isNaN(num) || !isFinite(num)) {
    throw new Error('Invalid number input');
  }
  return num;
}

// Validation middleware helper
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw new ValidationError('بيانات غير صالحة', errors);
    }
    throw error;
  }
}

// Custom validation error class
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// SQL injection prevention
export function escapeSQLString(str: string): string {
  return str.replace(/'/g, "''");
}

// XSS prevention for output
export function escapeHTML(str: string): string {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  return str.replace(/[&<>"'/]/g, char => htmlEscapeMap[char]);
}

// File upload validation
export function validateFileUpload(file: File, options?: {
  maxSize?: number;
  allowedTypes?: string[];
}): void {
  const maxSize = options?.maxSize || 10 * 1024 * 1024; // 10MB default
  const allowedTypes = options?.allowedTypes || ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  
  if (file.size > maxSize) {
    throw new ValidationError('حجم الملف كبير جداً', [
      { field: 'file', message: `الحد الأقصى لحجم الملف هو ${maxSize / 1024 / 1024}MB` }
    ]);
  }
  
  if (!allowedTypes.includes(file.type)) {
    throw new ValidationError('نوع الملف غير مسموح', [
      { field: 'file', message: `الأنواع المسموحة: ${allowedTypes.join(', ')}` }
    ]);
  }
  
  // Check file extension matches MIME type
  const ext = file.name.split('.').pop()?.toLowerCase();
  const mimeExtMap: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'application/pdf': ['pdf']
  };
  
  const expectedExts = mimeExtMap[file.type];
  if (expectedExts && ext && !expectedExts.includes(ext)) {
    throw new ValidationError('امتداد الملف لا يتطابق مع نوع الملف', [
      { field: 'file', message: 'الملف قد يكون تالفاً أو محرفاً' }
    ]);
  }
}
