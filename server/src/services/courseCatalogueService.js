import { normalizeCourseCode } from './timetableSourceProcessor.js';

export function createCourseCatalogueService(store) {
  return {
    async listCourses() {
      return store.listCourses();
    },
    async createCourse(input) {
      const course = validateCourse(input);
      if (await store.findCourseByCode(course.courseCode)) throw new Error(`Course ${course.courseCode} already exists`);
      return store.createCourse(course);
    },
    async updateCourse(courseId, input) {
      const course = validateCourse(input);
      const existing = await store.findCourseByCode(course.courseCode);
      if (existing && existing.courseId !== Number(courseId)) throw new Error(`Course ${course.courseCode} already exists`);
      return store.updateCourse(courseId, course);
    },
    async deleteCourse(courseId) {
      return store.deleteCourse(courseId);
    }
  };
}

function validateCourse(input) {
  const course = {
    courseCode: normalizeCourseCode(input.courseCode),
    courseName: String(input.courseName ?? '').trim(),
    yearOfStudy: Number(input.yearOfStudy),
    stream: String(input.stream ?? 'common').trim().toLowerCase()
  };
  if (!/^[A-Z]{2,8} \d{4}$/.test(course.courseCode)) throw new Error('Course code must look like MAT 1100 or MAT1100');
  if (!course.courseName || !Number.isInteger(course.yearOfStudy) || course.yearOfStudy < 1 || course.yearOfStudy > 8) throw new Error('Course name and valid year of study are required');
  return course;
}