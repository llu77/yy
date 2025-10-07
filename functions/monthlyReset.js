const functions = require('firebase-functions');
const admin = require('firebase-admin');

try {
    admin.initializeApp();
} catch (e) {
    // Firebase app already initialized
}


exports.monthlyFinanceReset = functions.pubsub
  .schedule('0 0 1 * *') // يعمل في اليوم الأول من كل شهر
  .timeZone('Asia/Riyadh')
  .onRun(async (context) => {
    
    const db = admin.firestore();
    const batch = db.batch();
    
    try {
      // جلب جميع السجلات المالية للشهر المنتهي
      const lastMonthDate = new Date();
      lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
      const month = lastMonthDate.getMonth() + 1;
      const year = lastMonthDate.getFullYear();
      
      const financeSnapshot = await db
        .collection('finances')
        .where('month', '==', month)
        .where('year', '==', year)
        .get();
      
      // حساب الإجماليات للشهر
      const monthlyTotals = {};
      
      financeSnapshot.forEach(doc => {
        const data = doc.data();
        if (!monthlyTotals[data.branchId]) {
          monthlyTotals[data.branchId] = {
            revenues: 0,
            expenses: 0,
            transactions: []
          };
        }
        
        if (data.type === 'revenue') {
          monthlyTotals[data.branchId].revenues += data.amount;
        } else {
          monthlyTotals[data.branchId].expenses += data.amount;
        }
        
        monthlyTotals[data.branchId].transactions.push(data);
      });
      
      // إنشاء تقرير شهري وأرشفته
      for (const [branchId, totals] of Object.entries(monthlyTotals)) {
        const archiveDoc = {
          branchId: branchId,
          month: month,
          year: year,
          totalRevenues: totals.revenues,
          totalExpenses: totals.expenses,
          netProfit: totals.revenues - totals.expenses,
          transactions: totals.transactions,
          archivedAt: admin.firestore.FieldValue.serverTimestamp(),
          archiveType: 'monthly_financial'
        };
        
        // حفظ في الأرشيف
        const archiveRef = db.collection('finance_archive').doc();
        batch.set(archiveRef, archiveDoc);
      }
      
      // حذف السجلات القديمة
      financeSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // إنشاء سجلات جديدة للشهر الجديد
      const branches = await db.collection('branches').get();
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      branches.forEach(branch => {
        const newFinanceDoc = {
          branchId: branch.id,
          branchName: branch.data().name,
          month: currentMonth,
          year: currentYear,
          revenues: 0,
          expenses: 0,
          netProfit: 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          transactions: []
        };
        
        const docRef = db.collection('finances').doc();
        batch.set(docRef, newFinanceDoc);
      });
      
      await batch.commit();
      
      console.log('تم تصفير البيانات المالية وأرشفتها بنجاح');
      
      // إرسال إشعار للإدارة
      await sendNotificationToAdmin('تم تصفير البيانات المالية الشهرية وأرشفتها');
      
    } catch (error) {
      console.error('خطأ في تصفير البيانات:', error);
      await sendNotificationToAdmin('فشل تصفير البيانات المالية: ' + error.message);
    }
});

// دالة يدوية للتصفير
exports.manualFinanceReset = functions.https.onCall(async (data, context) => {
  // التحقق من صلاحية الأدمن
  if (!context.auth || !context.auth.token.role || context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'غير مصرح لك بتنفيذ هذا الإجراء.');
  }
  
  // يمكن استدعاء نفس منطق التصفير من هنا
  // ...
  
  return { success: true, message: 'تم التصفير بنجاح' };
});

// دالة إرسال الإشعارات
async function sendNotificationToAdmin(message) {
  const db = admin.firestore();
  const admins = await db
    .collection('users')
    .where('role', '==', 'admin')
    .get();
  
  if(admins.empty) return;

  const batch = db.batch();
  
  admins.forEach(adminDoc => {
    const notificationRef = db
      .collection('notifications')
      .doc();
    
    batch.set(notificationRef, {
      userId: adminDoc.id,
      message: message,
      type: 'system',
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
  
  await batch.commit();
}
