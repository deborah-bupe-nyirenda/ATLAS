import test from 'node:test';
import assert from 'node:assert/strict';
import { createCourseCatalogueService } from './courseCatalogueService.js';

test('creates a course using normalized course-code identity', async () => {
  let saved;
  const service = createCourseCatalogueService({
    createCourse: async (course) => { saved = course; return { courseId: 9, ...course }; },
    findCourseByCode: async () => null
  });

  const course = await service.createCourse({ courseCode: 'mat1100', courseName: 'Foundation Mathematics', yearOfStudy: 1, stream: 'common' });

  assert.equal(course.courseCode, 'MAT 1100');
  assert.equal(saved.courseCode, 'MAT 1100');
});

test('rejects duplicate course codes', async () => {
  const service = createCourseCatalogueService({ findCourseByCode: async () => ({ courseCode: 'MAT 1100' }) });

  await assert.rejects(() => service.createCourse({ courseCode: 'MAT1100', courseName: 'Other name', yearOfStudy: 1, stream: 'common' }), /already exists/);
});

test('updates a course while preserving normalized code identity', async () => {
  let updated;
  const service = createCourseCatalogueService({
    findCourseByCode: async (code) => code === 'MAT 1100' ? { courseId: 4, courseCode: code } : null,
    updateCourse: async (courseId, course) => { updated = { courseId, ...course }; return updated; }
  });

  const course = await service.updateCourse(4, { courseCode: 'MAT1100', courseName: 'Foundation Mathematics', yearOfStudy: 1, stream: 'common' });

  assert.equal(course.courseCode, 'MAT 1100');
  assert.equal(updated.courseId, 4);
});

test('deletes a course by catalogue id', async () => {
  let deletedId;
  const service = createCourseCatalogueService({ deleteCourse: async (courseId) => { deletedId = courseId; return { deleted: true }; } });

  assert.deepEqual(await service.deleteCourse(9), { deleted: true });
  assert.equal(deletedId, 9);
});