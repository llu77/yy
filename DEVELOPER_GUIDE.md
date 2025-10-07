# 👨‍💻 دليل المطور - نظام BranchFlow المحسّن

## 🚀 البدء السريع

### المتطلبات الأساسية:
- Node.js v20.18.0 (استخدم nvm للتبديل: `nvm use`)
- Firebase CLI مثبت عالمياً
- حساب Firebase مع مشروع مُعد

### التثبيت:
```bash
# Clone المشروع
git clone [repository-url]
cd studio-main

# تثبيت التبعيات
npm install

# نسخ ملف البيئة
cp .env.example .env.local
# قم بتعديل .env.local بمعلومات Firebase الخاصة بك

# تشغيل المشروع في وضع التطوير
npm run dev
```

## 🔒 الميزات الأمنية الجديدة

### 1. Middleware الأمني
يتم تطبيق جميع security headers و rate limiting تلقائياً عبر `src/middleware.ts`.

### 2. Input Validation
```typescript
import { validateRequest, revenueSchema } from '@/lib/validation';

// مثال على الاستخدام
try {
  const validatedData = validateRequest(revenueSchema, formData);
  // استخدم validatedData بأمان
} catch (error) {
  // معالجة أخطاء التحقق
}
```

### 3. Logging System
```typescript
import { logger, SecurityEventType } from '@/lib/logger';

// تسجيل أحداث عادية
logger.info('User action', { userId, action });

// تسجيل أحداث أمنية
logger.security(SecurityEventType.LOGIN_ATTEMPT, { email });
```

### 4. Error Handling
تم إضافة Error Boundary تلقائياً في `layout.tsx`. للمكونات المخصصة:
```typescript
import { ErrorBoundary } from '@/components/error-boundary';

<ErrorBoundary fallback={<CustomError />}>
  <YourComponent />
</ErrorBoundary>
```

## ⚡ تحسينات الأداء

### 1. Lazy Loading
```typescript
import { lazyWithRetry, OptimizedSuspense } from '@/lib/performance-optimizations';

const MyComponent = lazyWithRetry(
  () => import('./MyComponent'),
  'MyComponent'
);

<OptimizedSuspense componentName="MyComponent">
  <MyComponent />
</OptimizedSuspense>
```

### 2. Virtual Lists
للقوائم الطويلة:
```typescript
import { VirtualList } from '@/lib/performance-optimizations';

<VirtualList
  items={data}
  height={400}
  itemHeight={50}
  renderItem={(item) => <ItemComponent {...item} />}
/>
```

### 3. Performance Monitoring
```typescript
import { usePerformanceMonitor } from '@/lib/performance-monitor';

function MyComponent() {
  const { measureOperation } = usePerformanceMonitor('MyComponent');
  
  const handleClick = () => {
    const measure = measureOperation('click-handler');
    measure.start();
    // عملياتك هنا
    measure.end();
  };
}
```

## 🧪 الاختبارات

### تشغيل الاختبارات:
```bash
# جميع الاختبارات
npm test

# وضع المراقبة
npm run test:watch

# تغطية الكود
npm run test:coverage

# اختبارات الأمان فقط
npm run test:security
```

### كتابة اختبارات جديدة:
```typescript
// src/__tests__/my-component.test.tsx
import { render, screen } from '@testing-library/react';
import MyComponent from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

## 📊 المراقبة والتسجيل

### عرض السجلات:
السجلات الأمنية تُخزن في Firestore في مجموعة `security_logs`.

### مراقبة الأداء:
افتح Developer Console وابحث عن:
- `[INFO] Navigation Performance Metrics`
- `[WARN] Slow operation detected`
- `[CRITICAL] High memory usage detected`

## 🔧 الصيانة

### فحص الأمان الدوري:
```bash
# فحص شامل
npm run check:all

# فحص التبعيات
npm run audit:deps

# إصلاح الثغرات التلقائي
npm run audit:fix
```

### النسخ الاحتياطي:
```bash
# يتم تلقائياً يومياً في الساعة 2 صباحاً
# أو يدوياً من واجهة المدير
```

## 🚨 استكشاف الأخطاء

### مشكلة: "PERMISSION_DENIED" في Firestore
**الحل**: تأكد من نشر القواعد الجديدة:
```bash
firebase deploy --only firestore:rules
```

### مشكلة: Rate limit exceeded
**الحل**: المعدل الحالي 100 طلب/دقيقة. للتطوير، يمكن تعديل `MAX_REQUESTS` في `middleware.ts`.

### مشكلة: أخطاء TypeScript بعد التحديث
**الحل**: تم تفعيل strict mode. قم بإصلاح الأخطاء أو استخدم:
```typescript
// @ts-ignore - مؤقت حتى الإصلاح
```

## 📚 الموارد الإضافية

- [Firebase Documentation](https://firebase.google.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

## 🤝 المساهمة

1. قم بإنشاء branch جديد للميزة/الإصلاح
2. تأكد من تشغيل `npm run check:all` قبل الـ commit
3. اكتب اختبارات للكود الجديد
4. قم بتحديث الوثائق إذا لزم الأمر

---

**آخر تحديث**: ديسمبر 2024
**الإصدار**: 1.0.0-enhanced
