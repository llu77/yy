

const { onCall } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, serverTimestamp } = require("firebase-admin/firestore");
const { onUserCreate } = require("firebase-functions/v2/auth");
const { logger } = require("firebase-functions");

initializeApp();
const db = getFirestore();

// NOTE: User document creation is now handled on the client-side in use-auth.tsx
// to simplify the auth flow and resolve permission race conditions.
// The onUserCreate function is no longer needed here.

// Take the text parameter passed to this HTTP endpoint and insert it into
// Firestore under the path /messages/:documentId/original
exports.addmessage = onCall((request) => {
  // Grab the text parameter.
  const original = request.data.text;
  // Push the new message into Firestore using the Firebase Admin SDK.
  const writeResult = db
      .collection("messages")
      .add({original: original});
  // Send back a message that we've succesfully written the message
  return {
    result: `Message with ID: ${writeResult.id} added.`,
  };
});

// Listens for new messages added to /messages/:documentId/original and creates an
// uppercase version of the message to /messages/:documentId/uppercase
exports.makeuppercase = onDocumentWritten("/messages/{documentId}", (event) => {
  // Grab the current value of what was written to Firestore.
  const original = event.data.after.data().original;

  // Access the parameter `{documentId}` with `event.params`
  logger.log("Uppercasing", event.params.documentId, original);

  const uppercase = original.toUpperCase();

  // You must return a Promise when performing asynchronous tasks inside a Functions such as
  // writing to Firestore.
  // Setting an 'uppercase' field in Firestore document returns a Promise.
  return event.data.after.ref.set({uppercase}, {merge: true});
});

exports.monthlyReset = require('./monthlyReset');
exports.backupDatabase = require('./backup');
