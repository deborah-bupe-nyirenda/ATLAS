export function createCourseConfirmationService(store) {
  return {
    async getSuggestedCourses(yearOfStudy, stream) {
      return store.findSuggestedCourses(Number(yearOfStudy), stream);
    },
    async searchCourses(query) {
      return store.searchCourses(query ?? '');
    },
    async confirmCourses({ studentId, academicYear, semester, courseCodes, carryOrRepeatCodes = [] }) {
      const courses = await store.findCoursesByCodes(courseCodes);
      if (courses.length !== courseCodes.length) {
        throw new Error('One or more selected courses could not be found');
      }
      const confirmation = {
        studentId,
        academicYear,
        semester,
        status: 'confirmed',
        confirmationDate: new Date().toISOString(),
        courses: courses.map((course) => ({ ...course, carryOrRepeat: carryOrRepeatCodes.includes(course.courseCode) }))
      };
      await store.saveConfirmation(studentId, confirmation);
      return confirmation;
    },
    async getRelevantTimetable(studentId) {
      const confirmation = await store.getConfirmation(studentId);
      if (!confirmation) return [];
      return store.findTimetableEntries(confirmation.courses.map((course) => course.courseCode));
    }
  };
}