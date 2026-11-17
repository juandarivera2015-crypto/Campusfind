'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const config = require('../config');
const { detectImageType } = require('../utils/fileType');
const { badRequest } = require('../utils/problem');

// Keep the upload in memory (bounded by the size limit) so we can inspect magic bytes before writing.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.uploads.maxBytes, files: 1, fields: 20 },
});

/** Validates the image by content and persists it with a random, server-chosen name. */
const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

async function persistImage(file) {
  if (!file) return null;
  const type = detectImageType(file.buffer);
  if (!type) throw badRequest('Only JPG, PNG, GIF and WebP images are allowed.');
  if (useBlob()) {
    // Vercel Blob (object storage). Returns a public https URL that is stored in objects.image
    const { put } = await import('@vercel/blob');
    const blob = await put(`objects/obj_${crypto.randomUUID()}.${type.ext}`, file.buffer, {
      access: 'public', contentType: type.mime, addRandomSuffix: false,
    });
    return blob.url;
  }
  await fs.promises.mkdir(config.uploads.dir, { recursive: true });
  const filename = `obj_${crypto.randomUUID()}.${type.ext}`;
  await fs.promises.writeFile(path.join(config.uploads.dir, filename), file.buffer, { mode: 0o644 });
  return `uploads/${filename}`;
}

async function removeImage(relPath) {
  if (!relPath) return;
  if (/^https:\/\//.test(relPath)) {
    if (useBlob()) {
      const { del } = await import('@vercel/blob');
      await del(relPath).catch(() => {});
    }
    return;
  }
  const name = path.basename(relPath); // never trust stored paths for traversal
  await fs.promises.unlink(path.join(config.uploads.dir, name)).catch(() => {});
}

module.exports = { upload, persistImage, removeImage };
