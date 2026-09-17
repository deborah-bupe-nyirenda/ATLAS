import test from 'node:test';
import assert from 'node:assert/strict';
import { createTimetableRevisionService } from './timetableRevisionService.js';

test('admin revision validates course codes and returns the change set', async () => {
  const saved = [];
  const store = {
    findCurrentTimetable: async () => [{ courseCode: 'MAT 1100', day: 'Monday', startTime: '08:00', endTime: '10:00', venue: 'Room A', lecturer: 'Dr. Banda' }],
    findCoursesByCodes: async (codes) => codes.map((courseCode) => ({ courseCode })),
    saveTimetableRevision: async (entries, comparison) => { saved.push({ entries, comparison }); return { revisionNumber: 2, status: 'current' }; }
  };
  const service = createTimetableRevisionService(store);
  const result = await service.revise([{ courseCode: 'MAT1100', day: 'Tuesday', startTime: '08:00', endTime: '10:00', venue: 'Room B', lecturer: 'Dr. Banda' }]);

  assert.equal(result.revision.revisionNumber, 2);
  assert.equal(result.changes.added[0].courseCode, 'MAT 1100');
  assert.equal(result.changes.removed[0].courseCode, 'MAT 1100');
  assert.equal(saved.length, 1);
});

test('admin revision ignores an out-of-scope course code', async () => {
  let saved;
  const service = createTimetableRevisionService({ findCurrentTimetable: async () => [], findCoursesByCodes: async () => [], saveTimetableRevision: async (entries) => { saved = entries; return { revisionNumber: 2, status: 'current' }; } });
  const result = await service.revise([{ courseCode: 'MAT 9999', day: 'Monday', startTime: '08:00', endTime: '10:00', venue: 'Room A', lecturer: 'Dr. Banda' }]);
  assert.equal(result.validation.ignoredCourseCodes[0], 'MAT 9999');
  assert.deepEqual(saved, []);
});

test('preview reports unknown exam courses without saving a revision', async () => {
  const store = { findCurrentTimetable: async () => [], findCoursesByCodes: async () => [{ courseCode: 'MAT 1100' }] };
  const service = createTimetableRevisionService(store);
  const preview = await service.preview([{ timetableType: 'exam', courseCode: 'MAT 1100', eventDate: '2025-09-29', startTime: '09:00', endTime: '12:00', venue: 'SPORTS HALL' }, { timetableType: 'exam', courseCode: 'CSC 3742', eventDate: '2025-09-29', startTime: '09:00', endTime: '12:00', venue: 'Room A' }], 'exam');

  assert.deepEqual(preview.validation.unknownCourseCodes, ['CSC 3742']);
  assert.equal(preview.validation.canPublish, false);
});

test('preview ignores courses outside the Computing and Informatics scope', async () => {
  const store = { findCurrentTimetable: async () => [], findCoursesByCodes: async (codes) => codes.map((courseCode) => ({ courseCode })) };
  const service = createTimetableRevisionService(store);
  const preview = await service.preview([
    { timetableType: 'exam', courseCode: 'CSC 2901', eventDate: '2025-09-29', startTime: '09:00', endTime: '12:00', venue: 'Room A' },
    { timetableType: 'exam', courseCode: 'BIO 1400', eventDate: '2025-09-29', startTime: '09:00', endTime: '12:00', venue: 'Room A' },
    { timetableType: 'exam', courseCode: 'GES 1310', eventDate: '2025-09-29', startTime: '09:00', endTime: '12:00', venue: 'Room A' }
  ], 'exam');

  assert.equal(preview.entries.length, 2);
  assert.deepEqual(preview.validation.ignoredCourseCodes, ['GES 1310']);
  assert.equal(preview.validation.canPublish, true);
});