#!/usr/bin/env node

/**
 * Simple development server for ZX Spectrum emulator
 * Serves files with proper MIME types and CORS headers
 */

import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 3000;
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.rom': 'application/octet-stream',
  '.tap': 'application/octet-stream',
  '.tzx': 'application/octet-stream',
  '.z80': 'application/octet-stream',
};

const server = createServer(async (req, res) => {
  // Default to index.html
  let filePath = req.url === '/' ? '/dev.html' : req.url;

  // Remove query strings
  filePath = filePath.split('?')[0];

  const fullPath = join(__dirname, filePath);
  const ext = extname(filePath);
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = await readFile(fullPath);

    res.writeHead(200, {
      'Content-Type': mimeType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });
    res.end(content);

    console.log(`[${new Date().toLocaleTimeString()}] 200 ${filePath}`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      console.log(`[${new Date().toLocaleTimeString()}] 404 ${filePath}`);
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
      console.error(`[${new Date().toLocaleTimeString()}] 500 ${filePath}`, error);
    }
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 Development server running at http://localhost:${PORT}/`);
  console.log(`📁 Serving files from: ${__dirname}`);
  console.log(`🔄 Edit source files and refresh browser to see changes\n`);
});
