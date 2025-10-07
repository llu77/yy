# دليل إعداد Cloudflare D1 Database لنظام GASAH

## الخطوة 1: إنشاء قاعدة البيانات D1

1. **سجل دخول إلى Cloudflare Dashboard**
   - اذهب إلى: https://dash.cloudflare.com
   - سجل دخول بحسابك

2. **إنشاء قاعدة بيانات D1**
   ```bash
   # من Workers & Pages > D1
   # اضغط "Create database"
   # الاسم: GASAH
   # Location: اختر الأقرب لموقعك
   ```

## الخطوة 2: إنشاء الجداول

انسخ هذا الكود SQL وقم بتنفيذه في D1 Console:

```sql
-- جدول المستخدمين
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    uid TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('مدير النظام', 'مشرف فرع', 'موظف', 'شريك')),
    branch TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول الإيرادات
CREATE TABLE IF NOT EXISTS revenue (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    branch TEXT NOT NULL,
    total_revenue REAL NOT NULL,
    cash REAL NOT NULL,
    card REAL NOT NULL,
    distribution TEXT NOT NULL, -- JSON string
    status TEXT NOT NULL CHECK(status IN ('Matched', 'Discrepancy', 'Unbalanced')),
    discrepancy_reason TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- جدول المصروفات
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    branch TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- جدول طلبات الموظفين
CREATE TABLE IF NOT EXISTS employee_requests (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    date DATE NOT NULL,
    employee TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    employee_branch TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected')),
    details TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES users(id)
);

-- جدول الرواتب
CREATE TABLE IF NOT EXISTS salaries (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    branch TEXT NOT NULL,
    date DATE NOT NULL,
    basic_salary REAL NOT NULL,
    bonuses REAL DEFAULT 0,
    deductions REAL DEFAULT 0,
    net_salary REAL NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'paid', 'rejected')),
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- جدول البونص
CREATE TABLE IF NOT EXISTS bonuses (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    branch TEXT NOT NULL,
    week_number INTEGER NOT NULL,
    month TEXT NOT NULL,
    year INTEGER NOT NULL,
    revenue_amount REAL NOT NULL,
    bonus_amount REAL NOT NULL,
    bonus_level INTEGER NOT NULL,
    is_approved INTEGER DEFAULT 0,
    approved_by TEXT,
    approved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES users(id)
);

-- جدول طلبات المنتجات
CREATE TABLE IF NOT EXISTS product_requests (
    id TEXT PRIMARY KEY,
    branch TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    urgency TEXT CHECK(urgency IN ('عادي', 'عاجل', 'طارئ')),
    status TEXT CHECK(status IN ('pending', 'approved', 'ordered', 'delivered', 'rejected')),
    notes TEXT,
    requested_by TEXT NOT NULL,
    approved_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requested_by) REFERENCES users(id)
);

-- جدول سجلات التدقيق
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    old_data TEXT, -- JSON
    new_data TEXT, -- JSON
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- إنشاء الفهارس لتحسين الأداء
CREATE INDEX idx_revenue_branch_date ON revenue(branch, date);
CREATE INDEX idx_expenses_branch_date ON expenses(branch, date);
CREATE INDEX idx_employee_requests_status ON employee_requests(status);
CREATE INDEX idx_salaries_employee ON salaries(employee_id);
CREATE INDEX idx_bonuses_employee_month ON bonuses(employee_id, month, year);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at);

-- إضافة المستخدمين الافتراضيين
INSERT INTO users (id, uid, name, email, role, branch) VALUES
-- مدير النظام
('USR001', 'admin001', 'مدير النظام', 'admin@branchflow.com', 'مدير النظام', 'كافة الفروع'),

-- فرع لبن
('USR002', 'laban001', 'عبدالحي', 'a@1.com', 'مشرف فرع', 'فرع لبن'),
('USR003', 'laban002', 'محمود عماره', 'm@1.com', 'موظف', 'فرع لبن'),
('USR004', 'laban003', 'علاء ناصر', 'alaa@1.com', 'موظف', 'فرع لبن'),
('USR005', 'laban004', 'السيد', 's@1.com', 'موظف', 'فرع لبن'),

-- فرع طويق
('USR006', 'tuwaiq001', 'محمد إسماعيل', 'm1@1.com', 'مشرف فرع', 'فرع طويق'),
('USR007', 'tuwaiq002', 'محمد ناصر', 'mn@1.com', 'موظف', 'فرع طويق'),
('USR008', 'tuwaiq003', 'فارس', 'f@1.com', 'موظف', 'فرع طويق'),
('USR009', 'tuwaiq004', 'السيد (طويق)', 's17@1.com', 'موظف', 'فرع طويق'),

-- الشركاء
('USR010', 'partner001', 'سالم الوادعي', 'w@1.com', 'شريك', 'كافة الفروع'),
('USR011', 'partner002', 'عبدالله المطيري', 'Ab@1.com', 'شريك', 'كافة الفروع'),
('USR012', 'partner003', 'سعود الجريسي', 'sa@1.com', 'شريك', 'كافة الفروع');
```

## الخطوة 3: إنشاء Cloudflare Worker

1. **إنشاء Worker جديد**
   ```bash
   # من Workers & Pages
   # اضغط "Create application"
   # اختر "Create Worker"
   # الاسم: gasah-api
   ```

2. **كود Worker API**
   
   انسخ هذا الكود في Worker:

```javascript
// gasah-api worker
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json',
    };

    // Handle OPTIONS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    // Check authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers
      });
    }

    const token = authHeader.substring(7);
    
    try {
      // Route handling
      const path = url.pathname;
      const method = request.method;

      // Revenue endpoints
      if (path === '/api/revenue') {
        if (method === 'GET') {
          const { results } = await env.GASAH.prepare(
            'SELECT * FROM revenue ORDER BY created_at DESC'
          ).all();
          return new Response(JSON.stringify(results), { headers });
        }
        
        if (method === 'POST') {
          const data = await request.json();
          const id = crypto.randomUUID();
          
          await env.GASAH.prepare(
            `INSERT INTO revenue (id, date, branch, total_revenue, cash, card, distribution, status, discrepancy_reason, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            id,
            data.date,
            data.branch,
            data.totalRevenue,
            data.cash,
            data.card,
            JSON.stringify(data.distribution),
            data.status,
            data.discrepancyReason || null,
            data.createdBy
          ).run();
          
          return new Response(JSON.stringify({ id, success: true }), { headers });
        }
      }

      // Expenses endpoints
      if (path === '/api/expenses') {
        if (method === 'GET') {
          const { results } = await env.GASAH.prepare(
            'SELECT * FROM expenses ORDER BY created_at DESC'
          ).all();
          return new Response(JSON.stringify(results), { headers });
        }
        
        if (method === 'POST') {
          const data = await request.json();
          const id = crypto.randomUUID();
          
          await env.GASAH.prepare(
            `INSERT INTO expenses (id, date, branch, category, amount, description, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            id,
            data.date,
            data.branch,
            data.category,
            data.amount,
            data.description,
            data.createdBy
          ).run();
          
          return new Response(JSON.stringify({ id, success: true }), { headers });
        }
      }

      // Delete endpoint
      if (path.startsWith('/api/') && method === 'DELETE') {
        const parts = path.split('/');
        const table = parts[2]; // revenue, expenses, etc.
        const id = parts[3];
        
        await env.GASAH.prepare(
          `DELETE FROM ${table} WHERE id = ?`
        ).bind(id).run();
        
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers
      });
    }
  },
};
```

## الخطوة 4: ربط D1 بـ Worker

1. في Worker settings
2. اذهب إلى "Variables"
3. في "D1 Database Bindings"
4. اضغط "Add binding"
5. Variable name: `GASAH`
6. D1 database: اختر قاعدة البيانات GASAH

## الخطوة 5: إعداد المشروع للاتصال بـ Cloudflare

أنشئ ملف `src/lib/cloudflare-d1.ts`:

```typescript
const API_URL = 'https://gasah-api.YOUR-SUBDOMAIN.workers.dev';

export class CloudflareD1Client {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async query(endpoint: string, method: string = 'GET', data?: any) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Revenue methods
  async getRevenue() {
    return this.query('/api/revenue');
  }

  async addRevenue(data: any) {
    return this.query('/api/revenue', 'POST', data);
  }

  async deleteRevenue(id: string) {
    return this.query(`/api/revenue/${id}`, 'DELETE');
  }

  // Expenses methods
  async getExpenses() {
    return this.query('/api/expenses');
  }

  async addExpense(data: any) {
    return this.query('/api/expenses', 'POST', data);
  }

  async deleteExpense(id: string) {
    return this.query(`/api/expenses/${id}`, 'DELETE');
  }
}
```

## الخطوة 6: تحديث `.env.local`

```env
NEXT_PUBLIC_CLOUDFLARE_API_URL=https://gasah-api.YOUR-SUBDOMAIN.workers.dev
NEXT_PUBLIC_CLOUDFLARE_API_TOKEN=your-secret-token-here
```

## الخطوة 7: النشر والاختبار

1. **انشر Worker**
   ```bash
   # في Cloudflare Dashboard
   # اضغط "Deploy"
   ```

2. **اختبر الاتصال**
   - افتح النظام
   - سجل دخول
   - جرب إضافة إيراد أو مصروف

## ملاحظات مهمة

- **الأمان:** استخدم JWT tokens للمصادقة
- **النسخ الاحتياطي:** D1 يحفظ نسخ احتياطية تلقائياً
- **الحدود:** D1 مجاني حتى 5GB و 5 مليون قراءة شهرياً
- **الأداء:** استخدم Durable Objects للبيانات الفورية

## استكشاف الأخطاء

1. تحقق من Logs في Worker
2. تأكد من D1 binding صحيح
3. تحقق من CORS headers
4. استخدم `wrangler tail` للمتابعة المباشرة