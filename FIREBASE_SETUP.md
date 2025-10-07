# دليل إعداد Firebase لنظام GASAH

## 1. إنشاء مشروع Firebase

1. اذهب إلى [Firebase Console](https://console.firebase.google.com)
2. اضغط "Create a project"
3. اسم المشروع: `gasah-system`
4. تابع الخطوات واختر الإعدادات الافتراضية

## 2. تفعيل Authentication

1. من القائمة الجانبية اختر "Authentication"
2. اضغط "Get started"
3. فعّل "Email/Password" من Sign-in methods
4. اضغط Save

## 3. إعداد Firestore Database

1. من القائمة الجانبية اختر "Firestore Database"
2. اضغط "Create database"
3. اختر "Start in production mode"
4. اختر الموقع: `europe-west3` (أو الأقرب لك)
5. اضغط "Enable"

## 4. إنشاء المستخدمين

في Authentication > Users، أضف المستخدمين التالية:

### مدير النظام
- Email: `admin@branchflow.com`
- Password: `Admin@2024`

### مشرفي الفروع
- Email: `a@1.com` (عبدالحي - فرع لبن)
- Password: `Laban@2024`

- Email: `m1@1.com` (محمد إسماعيل - فرع طويق)
- Password: `Tuwaiq@2024`

### الموظفين
أضف باقي المستخدمين بنفس الطريقة

## 5. قواعد الأمان (Security Rules)

اذهب إلى Firestore > Rules وضع هذه القواعد:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'مدير النظام';
    }
    
    function isSupervisor() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'مشرف فرع';
    }
    
    function isEmployee() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'موظف';
    }
    
    function isPartner() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'شريك';
    }
    
    function getUserBranch() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.branch;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
      allow update: if request.auth.uid == userId && 
        request.resource.data.role == resource.data.role && 
        request.resource.data.branch == resource.data.branch;
    }
    
    // Revenue collection
    match /revenue/{document} {
      allow read: if isAuthenticated() && 
        (isAdmin() || isPartner() || resource.data.branch == getUserBranch());
      allow create: if isAuthenticated() && 
        (isAdmin() || isSupervisor() || isEmployee()) &&
        (isAdmin() || request.resource.data.branch == getUserBranch());
      allow update: if isAuthenticated() && 
        (isAdmin() || (isSupervisor() && resource.data.branch == getUserBranch()));
      allow delete: if isAdmin();
    }
    
    // Expenses collection
    match /expenses/{document} {
      allow read: if isAuthenticated() && 
        (isAdmin() || isPartner() || resource.data.branch == getUserBranch());
      allow create: if isAuthenticated() && 
        (isAdmin() || isSupervisor() || isEmployee()) &&
        (isAdmin() || request.resource.data.branch == getUserBranch());
      allow update: if isAuthenticated() && 
        (isAdmin() || (isSupervisor() && resource.data.branch == getUserBranch()));
      allow delete: if isAdmin();
    }
    
    // Employee requests collection
    match /requests/{document} {
      allow read: if isAuthenticated() && 
        (isAdmin() || isSupervisor() || request.auth.uid == resource.data.employeeId);
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && 
        (isAdmin() || isSupervisor());
      allow delete: if isAdmin();
    }
    
    // Product requests collection
    match /productRequests/{document} {
      allow read: if isAuthenticated() && 
        (isAdmin() || isSupervisor());
      allow write: if isAuthenticated() && 
        (isAdmin() || isSupervisor());
    }
    
    // Salaries collection
    match /salaries/{document} {
      allow read: if isAuthenticated() && 
        (isAdmin() || isPartner() || 
         (isSupervisor() && resource.data.branch == getUserBranch()) ||
         (isEmployee() && request.auth.uid == resource.data.employeeId));
      allow write: if isAdmin() || isSupervisor();
    }
    
    // Bonuses collection
    match /bonuses/{document} {
      allow read: if isAuthenticated() && 
        (isAdmin() || isSupervisor());
      allow write: if isAdmin() || isSupervisor();
    }
    
    // Reports collection (read-only for most)
    match /reports/{document} {
      allow read: if isAuthenticated() && 
        (isAdmin() || isPartner());
      allow write: if isAdmin();
    }
    
    // Settings collection
    match /settings/{document} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // Audit logs collection (append-only)
    match /auditLogs/{document} {
      allow read: if isAdmin();
      allow create: if isAuthenticated();
      allow update, delete: if false; // Never allow updates or deletes
    }
  }
}
```

## 6. إنشاء الجداول (Collections)

في Firestore، أنشئ هذه المجموعات:

### users
```json
{
  "id": "USR001",
  "name": "عبدالحي",
  "email": "a@1.com",
  "role": "مشرف فرع",
  "branch": "فرع لبن",
  "isActive": true,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### revenue
```json
{
  "date": "2024-01-15",
  "branch": "فرع لبن",
  "totalRevenue": 5000,
  "cash": 3000,
  "card": 2000,
  "distribution": [
    {
      "employeeName": "محمود عماره",
      "amount": 2500
    }
  ],
  "status": "Matched",
  "createdBy": "USR001",
  "createdAt": "timestamp"
}
```

### expenses
```json
{
  "date": "2024-01-15",
  "branch": "فرع لبن",
  "category": "رواتب",
  "amount": 15000,
  "description": "رواتب شهر يناير",
  "createdBy": "USR001",
  "createdAt": "timestamp"
}
```

### requests
```json
{
  "type": "leave",
  "date": "2024-01-15",
  "employee": "محمود عماره",
  "employeeId": "USR002",
  "employeeBranch": "فرع لبن",
  "status": "pending",
  "details": "إجازة مرضية",
  "notes": "",
  "createdAt": "timestamp"
}
```

### salaries
```json
{
  "employeeId": "USR002",
  "employeeName": "محمود عماره",
  "branch": "فرع لبن",
  "date": "2024-01-31",
  "basicSalary": 5000,
  "bonuses": 500,
  "deductions": 200,
  "netSalary": 5300,
  "status": "pending",
  "createdBy": "USR001",
  "createdAt": "timestamp"
}
```

## 7. الحصول على مفاتيح الإعداد

1. اذهب إلى Project Settings (الترس في القائمة)
2. اختر "Project settings"
3. انزل إلى "Your apps"
4. اضغط على "Web" icon (</>)
5. سجل التطبيق باسم "GASAH Web"
6. انسخ الإعدادات التالية:

```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

## 8. إضافة الإعدادات للمشروع

أنشئ ملف `.env.local` في المجلد الرئيسي وضع فيه:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## 9. تفعيل Firebase في النظام

في ملف `src/lib/firebase.ts`، تأكد من أن الإعدادات صحيحة:

```typescript
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};
```

## 10. البدء بالاستخدام

1. أعد تشغيل الخادم: `npm run dev`
2. سجل دخول بحساب المدير
3. ابدأ بإدخال البيانات

## ملاحظات مهمة

- **النسخ الاحتياطي:** Firebase يحفظ نسخ احتياطية تلقائياً
- **الأمان:** جميع البيانات مشفرة ومحمية بقواعد أمان صارمة
- **التكلفة:** Firebase مجاني حتى 50,000 قراءة و 20,000 كتابة يومياً
- **الأداء:** البيانات تُحدث في الوقت الفعلي عبر جميع الأجهزة

## الدعم

إذا واجهت أي مشكلة:
1. تحقق من Console في Firebase للأخطاء
2. تأكد من أن القواعد الأمنية صحيحة
3. تحقق من أن المفاتيح في `.env.local` صحيحة