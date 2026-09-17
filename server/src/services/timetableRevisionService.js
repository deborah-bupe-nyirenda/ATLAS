import { compareTimetableEntries, inferSemesterFromCourseCode, normalizeCourseCode } from './timetableSourceProcessor.js';
import { validateTimetableEntries } from './examTimetableProcessor.js';
import { computingInformaticsCourseCodes } from './computingInformaticsCatalogue.js';

export function createTimetableRevisionService(store) {
  return {
    async getCurrentTimetable() {
      return store.findCurrentTimetable();
    },
    async preview(entries, format = 'lecture') {
      const normalizedAllEntries = entries.map((entry) => ({ ...entry, courseCode: normalizeCourseCode(entry.courseCode), semester: entry.semester ?? inferSemesterFromCourseCode(entry.courseCode) }));
      const normalizedEntries = normalizedAllEntries.filter((entry) => computingInformaticsCourseCodes.has(entry.courseCode));
      const ignoredCourseCodes = [...new Set(normalizedAllEntries.filter((entry) => !computingInformaticsCourseCodes.has(entry.courseCode)).map((entry) => entry.courseCode))];
      const knownCourses = await store.findCoursesByCodes([...new Set(normalizedEntries.map((entry) => entry.courseCode))]);
      const validation = validateTimetableEntries(normalizedEntries, new Set(knownCourses.map((course) => course.courseCode)), { requireDate: format === 'exam' });
      const current = await store.findCurrentTimetable();
      return { format, validation: { ...validation, ignoredCourseCodes, rowsIgnored: normalizedAllEntries.length - normalizedEntries.length }, changes: compareTimetableEntries(current, normalizedEntries), entries: normalizedEntries };
    },
    async revise(entries) {
      const format = entries[0]?.timetableType ?? 'lecture';
      const preview = await this.preview(entries, format);
      if (!preview.validation.canPublish) {
        const reason = preview.validation.unknownCourseCodes.length > 0
          ? `unknown course code: ${preview.validation.unknownCourseCodes.join(', ')}`
          : 'validation errors';
        throw new Error(`Timetable cannot be published: ${reason}`);
      }
      const revision = await store.saveTimetableRevision(preview.entries, preview.changes);
      return { revision, changes: preview.changes, validation: preview.validation };
    }
  };
}