import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExamTimetableText, validateTimetableEntries } from './examTimetableProcessor.js';

test('parses exam date and session context into canonical events', () => {
  const entries = parseExamTimetableText(`
MONDAY 29TH SEPTEMBER 2025 - FIRST SESSION: 09:00 - 12:00 HOURS
COURSE VENUE NUMBER OF STUDENTS
MAT 1100 SPORTS HALL 600
  `);

  assert.deepEqual(entries, [{
    timetableType: 'exam', courseCode: 'MAT 1100', semester: null, eventDate: '2025-09-29', day: 'Monday',
    startTime: '09:00', endTime: '12:00', sessionName: 'first', venue: 'SPORTS HALL',
    studentCapacity: 600, activityType: 'exam'
  }]);
});

test('creates one event per venue when a course occupies multiple venues', () => {
  const entries = parseExamTimetableText(`
THURSDAY 25TH SEPTEMBER 2025 - FIRST SESSION: 09:00 - 12:00 HOURS
COURSE VENUE NUMBER OF STUDENTS
PHY 1010 SPORTS HALL 600
LIB BASEMENT 200
NSLT 150
  `);

  assert.deepEqual(entries.map((entry) => [entry.courseCode, entry.venue, entry.studentCapacity]), [
    ['PHY 1010', 'SPORTS HALL', 600], ['PHY 1010', 'LIB BASEMENT', 200], ['PHY 1010', 'NSLT', 150]
  ]);
});

test('handles stacked course codes sharing a venue column', () => {
  const entries = parseExamTimetableText(`
MONDAY 29TH SEPTEMBER 2025 - SECOND SESSION: 14:00 – 17:00 HOURS
COURSE VENUE NUMBER OF STUDENTS
MAT 4622
BIO 3132
NSLT 25
10
  `);

  assert.deepEqual(entries.map((entry) => [entry.courseCode, entry.venue, entry.studentCapacity]), [
    ['MAT 4622', 'NSLT', 25], ['BIO 3132', 'NSLT', 10]
  ]);
});

test('reports unknown codes and incomplete rows without publishing them', () => {
  const result = validateTimetableEntries([
    { courseCode: 'MAT 1100', venue: '', eventDate: '2025-09-29', startTime: '09:00', endTime: '12:00' },
    { courseCode: 'ZZZ 9999', venue: 'Room A', eventDate: '2025-09-29', startTime: '09:00', endTime: '12:00' }
  ], new Set(['MAT 1100']));

  assert.deepEqual(result.unknownCourseCodes, ['ZZZ 9999']);
  assert.equal(result.missingVenue, 1);
  assert.equal(result.canPublish, false);
});

test('does not report a clash for different-semester courses in the same slot', () => {
  const result = validateTimetableEntries([
    { courseCode: 'CSC 2901', semester: 'first', eventDate: '2025-09-29', startTime: '09:00', endTime: '12:00', venue: 'Room A' },
    { courseCode: 'CSC 2912', semester: 'second', eventDate: '2025-09-29', startTime: '09:00', endTime: '12:00', venue: 'Room A' }
  ], new Set(['CSC 2901', 'CSC 2912']));

  assert.equal(result.possibleClashes.length, 0);
});

test('reports a clash when same-semester courses share a slot', () => {
  const result = validateTimetableEntries([
    { courseCode: 'CSC 2901', semester: 'first', eventDate: '2025-09-29', startTime: '09:00', endTime: '12:00', venue: 'Room A' },
    { courseCode: 'CSC 2101', semester: 'first', eventDate: '2025-09-29', startTime: '09:00', endTime: '12:00', venue: 'Room A' }
  ], new Set(['CSC 2901', 'CSC 2101']));

  assert.equal(result.possibleClashes.length, 2);
});