import test from 'node:test';
import assert from 'node:assert/strict';
import { createCourseConfirmationService } from './courseConfirmationService.js';
import { createMemoryStore } from '../repositories/memoryStore.js';

test('suggests stream courses for the selected year', async () => {
  const service = createCourseConfirmationService(createMemoryStore());

  const courses = await service.getSuggestedCourses(3, 'software-engineering');

  assert.deepEqual(courses.map((course) => course.courseCode), [
    'CSC 3801', 'CSC 3600', 'CSC 3301', 'CSC 3612', 'CSC 3712', 'CSC 3011', 'CSC 3402', 'CSC 3009'
  ]);
});

test('confirms selected courses and includes a carry course', async () => {
  const store = createMemoryStore();
  const service = createCourseConfirmationService(store);

  const result = await service.confirmCourses({
    studentId: 'demo-student',
    academicYear: 2026,
    semester: '1',
    courseCodes: ['CSC 3600', 'CSC 2702'],
    carryOrRepeatCodes: ['CSC 2702']
  });

  assert.equal(result.status, 'confirmed');
  assert.deepEqual(result.courses.map((course) => course.courseCode), ['CSC 3600', 'CSC 2702']);
  assert.equal(result.courses[1].carryOrRepeat, true);
});

test('returns timetable entries only for confirmed courses', async () => {
  const store = createMemoryStore();
  const service = createCourseConfirmationService(store);

  await service.confirmCourses({
    studentId: 'demo-student',
    academicYear: 2026,
    semester: '1',
    courseCodes: ['CSC 3600'],
    carryOrRepeatCodes: []
  });

  assert.deepEqual((await service.getRelevantTimetable('demo-student')).map((entry) => entry.courseCode), ['CSC 3600']);
});

test('waits for confirmation persistence before returning', async () => {
  let persisted = false;
  const store = {
    findCoursesByCodes: async () => [{ courseCode: 'CSC 3600', courseName: 'Software Engineering' }],
    saveConfirmation: async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      persisted = true;
    }
  };
  const service = createCourseConfirmationService(store);

  await service.confirmCourses({ studentId: 'demo-student', academicYear: 2026, semester: '1', courseCodes: ['CSC 3600'] });

  assert.equal(persisted, true);
});