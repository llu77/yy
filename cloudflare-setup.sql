-- GASAH System Database Schema for Cloudflare D1
-- Copy and paste this in D1 Console

-- إنشاء جدول المستخدمين
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

-- إنشاء جدول الإيرادات
CREATE TABLE IF NOT EXISTS revenue (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    branch TEXT NOT NULL,
    total_revenue REAL NOT NULL,
    cash REAL NOT NULL,
    card REAL NOT NULL,
    distribution TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('Matched', 'Discrepancy', 'Unbalanced')),
    discrepancy_reason TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء جدول المصروفات
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    branch TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- إضافة المستخدمين الافتراضيين
INSERT INTO users (id, uid, name, email, role, branch) VALUES
('USR001', 'admin001', 'مدير النظام', 'admin@branchflow.com', 'مدير النظام', 'كافة الفروع'),
('USR002', 'laban001', 'عبدالحي', 'a@1.com', 'مشرف فرع', 'فرع لبن'),
('USR003', 'laban002', 'محمود عماره', 'm@1.com', 'موظف', 'فرع لبن'),
('USR004', 'laban003', 'علاء ناصر', 'alaa@1.com', 'موظف', 'فرع لبن'),
('USR005', 'tuwaiq001', 'محمد إسماعيل', 'm1@1.com', 'مشرف فرع', 'فرع طويق'),
('USR006', 'tuwaiq002', 'محمد ناصر', 'mn@1.com', 'موظف', 'فرع طويق');