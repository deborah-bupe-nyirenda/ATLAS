import { Router } from 'express';
import multer from 'multer';
import { spawn } from 'node:child_process';
import { requireRole } from '../middleware/rbac.js';
import { parseTimetableCsv, parseTimetableText, parseLectureGridText, parseLectureLayoutText } from '../services/timetableSourceProcessor.js';
import { detectTimetableFormat } from '../services/timetableSourceProcessor.js';
import { parseExamTimetableText } from '../services/examTimetableProcessor.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function extractPdfText(buffer) {
  return new Promise((resolve, reject) => {
    const process = spawn('pdftotext', ['-layout', '-', '-']);
    let output = '';
    let error = '';
    process.stdout.on('data', (chunk) => { output += chunk; });
    process.stderr.on('data', (chunk) => { error += chunk; });
    process.on('error', reject);
    process.on('close', (code) => code === 0 ? resolve(output) : reject(new Error(error || 'Could not read PDF timetable')));
    process.stdin.end(buffer);
  });
}

async function parseUpload(file) {
  if (!file) throw new Error('Upload a CSV or PDF timetable file');
  if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) return parseTimetableCsv(file.buffer.toString('utf8'));
  if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
    const text = await extractPdfText(file.buffer);
    if (detectTimetableFormat(text) === 'exam') return parseExamTimetableText(text);
    try { return parseLectureLayoutText(text); } catch { try { return parseLectureGridText(text); } catch { return parseTimetableText(text); } }
  }
  throw new Error('Only CSV and PDF timetable files are supported');
}

export function createAdminRoutes(revisionService, authService, catalogueService) {
  const router = Router();
  router.use(requireRole(authService, 'admin'));
  router.get('/timetable', async (_request, response) => response.json(await revisionService.getCurrentTimetable()));
  router.get('/courses', async (_request, response) => response.json(await catalogueService.listCourses()));
  router.post('/courses', async (request, response) => {
    try {
      response.status(201).json(await catalogueService.createCourse(request.body));
    } catch (error) {
      response.status(400).json({ error: error.message });
    }
  });
  router.put('/courses/:courseId', async (request, response) => {
    try {
      response.json(await catalogueService.updateCourse(request.params.courseId, request.body));
    } catch (error) {
      response.status(400).json({ error: error.message });
    }
  });
  router.delete('/courses/:courseId', async (request, response) => {
    try {
      response.json(await catalogueService.deleteCourse(request.params.courseId));
    } catch (error) {
      response.status(409).json({ error: 'Course cannot be deleted because it is used by timetable or confirmation records' });
    }
  });
  router.post('/timetable/preview', upload.single('timetable'), async (request, response) => {
    try {
      const entries = await parseUpload(request.file);
      const format = entries[0]?.timetableType ?? 'lecture';
      response.json(await revisionService.preview(entries, format));
    } catch (error) {
      response.status(400).json({ error: error.message });
    }
  });
  router.post('/timetable/revisions', upload.single('timetable'), async (request, response) => {
    try {
      const entries = await parseUpload(request.file);
      response.status(201).json(await revisionService.revise(entries));
    } catch (error) {
      response.status(400).json({ error: error.message });
    }
  });
  return router;
}