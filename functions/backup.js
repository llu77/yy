
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const firestore = require('@google-cloud/firestore');
const client = new firestore.v1.FirestoreAdminClient();

try {
    admin.initializeApp();
} catch (e) {
    // Firebase app already initialized
}

// Automatically backup the entire database every 12 hours
exports.scheduledFirestoreExport = functions.pubsub
  .schedule('every 12 hours')
  .onRun(async (context) => {
    const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
    const databaseName = client.databasePath(projectId, '(default)');
    const bucket = `gs://${projectId}-firestore-backups`;

    try {
      const responses = await client.exportDocuments({
        name: databaseName,
        outputUriPrefix: bucket,
        // Leave collectionIds empty to export all collections
        collectionIds: [],
      });

      const response = responses[0];
      console.log(`Operation name: ${response['name']}`);
      return { success: true, message: 'Backup operation started successfully.' };

    } catch (error) {
      console.error('Error starting Firestore export:', error);
      throw new functions.https.HttpsError('internal', 'Could not start database backup.');
    }
  });
