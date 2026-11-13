'use strict';
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

let cached;
/** Loads the OpenAPI 3.0 contract (single source of truth for docs, Postman and AI tests). */
function loadSpec() {
  if (!cached) {
    cached = yaml.load(fs.readFileSync(path.join(__dirname, 'openapi.yaml'), 'utf8'));
    if (!String(cached.openapi).startsWith('3.0')) throw new Error('Expected an OpenAPI 3.0.x document');
  }
  return cached;
}
module.exports = { loadSpec };
