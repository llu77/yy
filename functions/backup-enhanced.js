const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');
const firestore = require('@google-cloud/firestore');
const { logger } = require('firebase-functions');

// Initialize
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const storage = new Storage();
const client = new firestore.v1.FirestoreAdminClient();
const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
const bucketName = process.env.STORAGE_BUCKET || `${projectId}.appspot.com`;

// Backup configuration
const BACKUP_CONFIG = {
  collections: ['users', 'revenue', 'expenses', 'requests', 'security_logs'],
  retentionDays: 30,
  maxBackups: 30,
  compressionEnabled: true
};

/**
 * Enhanced scheduled backup with monitoring
 * Runs daily at 2 AM Riyadh time
 */
exports.scheduledBackup = functions.pubsub
  .schedule('0 2 * * *')
  .timeZone('Asia/Riyadh')
  .onRun(async (context) => {
    const backupId = `backup_${new Date().toISOString().split('T')[0]}_${Date.now()}`;
    const startTime = Date.now();
    
    logger.info('Starting scheduled backup', { backupId });
    
    try {
      // Use Firestore Export API for full backup
      const databaseName = client.databasePath(projectId, '(default)');
      const bucket = `gs://${projectId}-firestore-backups/${backupId}`;
      
      const responses = await client.exportDocuments({
        name: databaseName,
        outputUriPrefix: bucket,
        collectionIds: BACKUP_CONFIG.collections,
      });
      
      const operation = responses[0];
      const duration = Date.now() - startTime;
      
      // Log backup completion
      await db.collection('system_logs').add({
        type: 'backup_completed',
        backupId,
        operationName: operation.name,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        duration,
        collections: BACKUP_CONFIG.collections,
        success: true
      });
      
      // Clean old backups
      await cleanOldBackups();
      
      logger.info('Backup operation started successfully', {
        backupId,
        operationName: operation.name,
        duration
      });
      
      return { success: true, backupId, operationName: operation.name };
    } catch (error) {
      logger.error('Backup failed', { backupId, error: error.message });
      
      // Log failure
      await db.collection('system_logs').add({
        type: 'backup_failed',
        backupId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        error: error.message,
        success: false
      });
      
      throw error;
    }
  });

/**
 * Manual backup trigger (restricted to admin users)
 */
exports.manualBackup = functions.https.onCall(async (data, context) => {
  // Verify admin role
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'يجب تسجيل الدخول لتنفيذ هذا الإجراء'
    );
  }
  
  // Check admin role from user document
  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  const userData = userDoc.data();
  
  if (!userData || userData.role !== 'مدير النظام') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'ليس لديك الصلاحيات الكافية لتنفيذ النسخ الاحتياطي'
    );
  }
  
  const backupId = `manual_backup_${Date.now()}`;
  logger.info('Manual backup triggered', { 
    backupId, 
    userId: context.auth.uid,
    userEmail: userData.email 
  });
  
  try {
    const databaseName = client.databasePath(projectId, '(default)');
    const bucket = `gs://${projectId}-firestore-backups/${backupId}`;
    
    const responses = await client.exportDocuments({
      name: databaseName,
      outputUriPrefix: bucket,
      collectionIds: data.collections || BACKUP_CONFIG.collections,
    });
    
    const operation = responses[0];
    
    // Log manual backup
    await db.collection('system_logs').add({
      type: 'manual_backup_initiated',
      backupId,
      operationName: operation.name,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      triggeredBy: context.auth.uid,
      collections: data.collections || BACKUP_CONFIG.collections
    });
    
    return {
      success: true,
      backupId,
      operationName: operation.name,
      message: 'تم بدء عملية النسخ الاحتياطي بنجاح'
    };
  } catch (error) {
    logger.error('Manual backup failed', { error: error.message });
    throw new functions.https.HttpsError(
      'internal',
      'فشل النسخ الاحتياطي: ' + error.message
    );
  }
});

/**
 * Import/Restore from backup (admin only)
 */
exports.restoreFromBackup = functions.https.onCall(async (data, context) => {
  // Verify admin authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }
  
  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  const userData = userDoc.data();
  
  if (!userData || userData.role !== 'مدير النظام') {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }
  
  const { backupId, collections } = data;
  
  if (!backupId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'معرف النسخة الاحتياطية مطلوب'
    );
  }
  
  logger.warn('Restore operation initiated', {
    backupId,
    collections,
    userId: context.auth.uid
  });
  
  try {
    const databaseName = client.databasePath(projectId, '(default)');
    const inputUriPrefix = `gs://${projectId}-firestore-backups/${backupId}`;
    
    const responses = await client.importDocuments({
      name: databaseName,
      inputUriPrefix: inputUriPrefix,
      collectionIds: collections || [],
    });
    
    const operation = responses[0];
    
    // Log restore operation
    await db.collection('system_logs').add({
      type: 'backup_restored',
      backupId,
      operationName: operation.name,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      restoredBy: context.auth.uid,
      collections: collections || 'all'
    });
    
    return {
      success: true,
      operationName: operation.name,
      message: 'تم بدء عملية الاستعادة بنجاح'
    };
  } catch (error) {
    logger.error('Restore failed', { error: error.message });
    throw new functions.https.HttpsError(
      'internal',
      'فشلت عملية الاستعادة: ' + error.message
    );
  }
});

/**
 * Clean old backups based on retention policy
 */
async function cleanOldBackups() {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - BACKUP_CONFIG.retentionDays);
    
    // Get backup logs
    const logsSnapshot = await db.collection('system_logs')
      .where('type', 'in', ['backup_completed', 'manual_backup_initiated'])
      .where('timestamp', '<', cutoffDate)
      .orderBy('timestamp', 'asc')
      .limit(50)
      .get();
    
    const deletePromises = [];
    
    logsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.backupId) {
        // Log deletion
        deletePromises.push(
          db.collection('system_logs').add({
            type: 'backup_deleted',
            backupId: data.backupId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            reason: 'retention_policy',
            originalDate: data.timestamp
          })
        );
        
        // Note: Actual GCS cleanup would need to be done separately
        // as Firestore Export API doesn't provide direct deletion
      }
    });
    
    await Promise.all(deletePromises);
    
    if (deletePromises.length > 0) {
      logger.info(`Marked ${deletePromises.length} old backups for deletion`);
    }
  } catch (error) {
    logger.error('Failed to clean old backups', { error: error.message });
  }
}

/**
 * List available backups with metadata
 */
exports.listBackups = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }
  
  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  const userData = userDoc.data();
  
  if (!userData || !['مدير النظام', 'مشرف فرع'].includes(userData.role)) {
    throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
  }
  
  try {
    // Get backup logs from system_logs
    const logsSnapshot = await db.collection('system_logs')
      .where('type', 'in', ['backup_completed', 'manual_backup_initiated'])
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
    
    const backups = [];
    
    logsSnapshot.forEach(doc => {
      const data = doc.data();
      backups.push({
        id: doc.id,
        backupId: data.backupId,
        type: data.type === 'manual_backup_initiated' ? 'manual' : 'scheduled',
        timestamp: data.timestamp?.toDate() || new Date(data.timestamp),
        duration: data.duration,
        collections: data.collections,
        operationName: data.operationName,
        triggeredBy: data.triggeredBy
      });
    });
    
    return {
      success: true,
      backups
    };
  } catch (error) {
    logger.error('Failed to list backups', { error: error.message });
    throw new functions.https.HttpsError(
      'internal',
      'فشل في جلب قائمة النسخ الاحتياطية'
    );
  }
});

/**
 * Check backup operation status
 */
exports.checkBackupStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }
  
  const { operationName } = data;
  
  if (!operationName) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Operation name is required'
    );
  }
  
  try {
    const [operation] = await client.getOperation({ name: operationName });
    
    return {
      success: true,
      done: operation.done,
      metadata: operation.metadata,
      error: operation.error,
      response: operation.response
    };
  } catch (error) {
    logger.error('Failed to check operation status', { error: error.message });
    throw new functions.https.HttpsError(
      'internal',
      'فشل في التحقق من حالة العملية'
    );
  }
});

module.exports = exports;
