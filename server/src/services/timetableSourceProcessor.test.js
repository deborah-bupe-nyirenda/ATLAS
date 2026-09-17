import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTimetableCsv, compareTimetableEntries, parseLectureGridText, parseLectureLayoutText } from './timetableSourceProcessor.js';

test('parses CSV timetable rows using course codes as identity', () => {
  const rows = parseTimetableCsv([
    'courseCode,day,startTime,endTime,venue,lecturer',
    'MAT1100,Monday,08:00,10:00,Room A,Dr. Banda',
    'CSC 3600,Tuesday,10:00,12:00,Room B,Dr. Moyo'
  ].join('\n'));

  assert.deepEqual(rows, [
    { courseCode: 'MAT 1100', day: 'Monday', startTime: '08:00', endTime: '10:00', venue: 'Room A', lecturer: 'Dr. Banda' },
    { courseCode: 'CSC 3600', day: 'Tuesday', startTime: '10:00', endTime: '12:00', venue: 'Room B', lecturer: 'Dr. Moyo' }
  ]);
});

test('reports timetable additions and removals by course code and slot', () => {
  const comparison = compareTimetableEntries(
    [{ courseCode: 'MAT 1100', day: 'Monday', startTime: '08:00', endTime: '10:00', venue: 'Room A', lecturer: 'Dr. Banda' }],
    [{ courseCode: 'MAT 1100', day: 'Tuesday', startTime: '08:00', endTime: '10:00', venue: 'Room B', lecturer: 'Dr. Banda' }]
  );

  assert.equal(comparison.added.length, 1);
  assert.equal(comparison.removed.length, 1);
  assert.equal(comparison.added[0].courseCode, 'MAT 1100');
});

test('treats MySQL seconds and upload minutes as the same time', () => {
  const comparison = compareTimetableEntries(
    [{ courseCode: 'MAT 1100', day: 'Monday', startTime: '08:00:00', endTime: '10:00:00', venue: 'Room A', lecturer: 'Dr. Banda' }],
    [{ courseCode: 'MAT 1100', day: 'Monday', startTime: '08:00', endTime: '10:00', venue: 'Room A', lecturer: 'Dr. Banda' }]
  );

  assert.equal(comparison.added.length, 0);
  assert.equal(comparison.removed.length, 0);
  assert.equal(comparison.unchanged.length, 1);
});

test('rejects timetable rows without a course code', () => {
  assert.throws(() => parseTimetableCsv('courseCode,day,startTime,endTime,venue,lecturer\n,Monday,08:00,10:00,Room A,Dr. Banda'), /courseCode/);
});

test('parses a lecture timetable grid by day and time column', () => {
  const entries = parseLectureGridText([
    'Day|07:00-07:50|08:00-08:50|09:00-09:50',
    'MONDAY||Bio 1401 Lab (NSLT)|',
    'TUESDAY|Physics 1010 (NSLT)||Math 1100 (GLT)'
  ].join('\n'));

  assert.deepEqual(entries, [
    { timetableType: 'lecture', courseCode: 'BIO 1401', day: 'Monday', startTime: '08:00', endTime: '08:50', venue: 'NSLT', activityType: 'lab' },
    { timetableType: 'lecture', courseCode: 'PHYSICS 1010', day: 'Tuesday', startTime: '07:00', endTime: '07:50', venue: 'NSLT', activityType: 'lecture' },
    { timetableType: 'lecture', courseCode: 'MATH 1100', day: 'Tuesday', startTime: '09:00', endTime: '09:50', venue: 'GLT', activityType: 'lecture' }
  ]);
});

test('parses the fixed-column Excel-to-PDF lecture layout', () => {
  const entries = parseLectureLayoutText([
    'SME   07:00 – 07:50   08.00 –08.50          09.00 –09.50',
    '                      BIO2701/2302 GLT      CHE3611/3622 C126',
    'MON                   CHE4211/4221 C126      PHY4221/4222 SEM'
  ].join('\n'));

  assert.deepEqual(entries.map(({ courseCode, semester, day, startTime, venue }) => ({ courseCode, semester, day, startTime, venue })), [
    { courseCode: 'BIO 2701', semester: 'first', day: 'Monday', startTime: '08:00', venue: 'GLT' },
    { courseCode: 'BIO 2302', semester: 'second', day: 'Monday', startTime: '08:00', venue: 'GLT' },
    { courseCode: 'CHE 3611', semester: 'first', day: 'Monday', startTime: '09:00', venue: 'C126' },
    { courseCode: 'CHE 3622', semester: 'second', day: 'Monday', startTime: '09:00', venue: 'C126' },
    { courseCode: 'CHE 4211', semester: 'first', day: 'Monday', startTime: '08:00', venue: 'C126' },
    { courseCode: 'CHE 4221', semester: 'first', day: 'Monday', startTime: '08:00', venue: 'C126' },
    { courseCode: 'PHY 4221', semester: 'first', day: 'Monday', startTime: '09:00', venue: 'SEM' },
    { courseCode: 'PHY 4222', semester: 'second', day: 'Monday', startTime: '09:00', venue: 'SEM' }
  ]);
});