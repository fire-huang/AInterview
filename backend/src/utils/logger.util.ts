import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 3;

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function rotateIfNeeded() {
  if (!fs.existsSync(LOG_FILE)) return;
  const stats = fs.statSync(LOG_FILE);
  if (stats.size < MAX_SIZE) return;

  // Rotate: app.log → app.log.1 → app.log.2 → delete app.log.3
  for (let i = MAX_FILES - 1; i >= 1; i--) {
    const oldFile = path.join(LOG_DIR, `app.log.${i}`);
    const newFile = path.join(LOG_DIR, `app.log.${i + 1}`);
    if (fs.existsSync(newFile)) fs.unlinkSync(newFile);
    if (fs.existsSync(oldFile)) fs.renameSync(oldFile, newFile);
  }
  fs.renameSync(LOG_FILE, path.join(LOG_DIR, 'app.log.1'));
}

function writeToFile(level: string, msg: string) {
  ensureLogDir();
  rotateIfNeeded();
  const line = `[${new Date().toISOString()}] [${level}] ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line, 'utf8');
}

function formatArgs(args: any[]): string {
  return args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
}

export const logger = {
  info(...args: any[]) {
    const msg = formatArgs(args);
    console.log(msg);
    writeToFile('INFO', msg);
  },
  warn(...args: any[]) {
    const msg = formatArgs(args);
    console.warn(msg);
    writeToFile('WARN', msg);
  },
  error(...args: any[]) {
    const msg = formatArgs(args);
    console.error(msg);
    writeToFile('ERROR', msg);
  },
  debug(...args: any[]) {
    if (process.env.NODE_ENV === 'development') {
      const msg = formatArgs(args);
      console.log(msg);
      writeToFile('DEBUG', msg);
    }
  },
};