const { google } = require('googleapis');
const path = require('path');
const stream = require('stream');
const env = require('../config/env');

let driveClient = null;

function getDriveClient() {
  if (!driveClient) {
    const folderId = env.googleDriveFolderId;
    const credentialsPath = env.googleDriveCredentials;
    if (!folderId || !credentialsPath) {
      return null;
    }
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
    driveClient = {
      drive: google.drive({ version: 'v3', auth }),
      folderId,
    };
  }
  return driveClient;
}

function isConfigured() {
  return !!(env.googleDriveFolderId && env.googleDriveCredentials);
}

/**
 * Get or create a subfolder for the client.
 */
async function getOrCreateClientFolder(drive, parentId, clientId) {
  const folderName = clientId || 'general';
  const res = await drive.files.list({
    q: `'${parentId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder'`,
    fields: 'files(id)',
  });
  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });
  return folder.data.id;
}

/**
 * Upload a file buffer to Google Drive.
 * @param {Buffer} buffer - File buffer
 * @param {string} originalName - Original filename
 * @param {string} mimeType - MIME type
 * @param {string} clientId - Client ID for folder organization
 * @returns {Promise<{fileId: string, storedName: string, webViewLink?: string}>}
 */
async function uploadFile(buffer, originalName, mimeType, clientId) {
  const client = getDriveClient();
  if (!client) throw new Error('Google Drive not configured');

  const { drive, folderId } = client;
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);
  const { v4: uuidv4 } = require('uuid');
  const storedName = `${baseName}-${uuidv4()}${ext}`;

  const parentId = await getOrCreateClientFolder(drive, folderId, clientId);
  const fileMetadata = {
    name: storedName,
    parents: [parentId],
  };

  const bufferStream = new stream.PassThrough();
  bufferStream.end(buffer);

  const media = {
    mimeType: mimeType || 'application/octet-stream',
    body: bufferStream,
  };

  const file = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, name, webViewLink',
  });

  return {
    fileId: file.data.id,
    storedName,
    webViewLink: file.data.webViewLink,
  };
}

module.exports = { getDriveClient, isConfigured, uploadFile };
