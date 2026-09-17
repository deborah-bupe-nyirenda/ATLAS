let courses = [
  ['PHY 1010', 'Physics', 1, 'common'], ['CHE 1000', 'Chemistry', 1, 'common'], ['BIO 1401', 'Biology', 1, 'common'],
  ['BIO 1412', 'Biology II', 1, 'common'], ['MAT 1100', 'Mathematics', 1, 'common'],
  ['CSC 2901', 'Computing Fundamentals', 2, 'common'], ['CSC 2101', 'Computer Architecture', 2, 'common'],
  ['CSC 2111', 'Data Structures', 2, 'common'], ['CSC 2702', 'Database & Information Management', 2, 'common'],
  ['CSC 2202', 'Operating Systems', 2, 'common'], ['CSC 2000', 'Object-Oriented Programming', 2, 'common'], ['CSC 2912', 'Discrete Mathematics', 2, 'common'],
  ['CSC 3801', 'Data Communication & Networks', 3, 'software-engineering'], ['CSC 3600', 'Software Engineering', 3, 'software-engineering'],
  ['CSC 3301', 'Programming Languages Design', 3, 'software-engineering'], ['CSC 3612', 'IT Project Management', 3, 'software-engineering'],
  ['CSC 3712', 'Advanced Databases', 3, 'software-engineering'], ['CSC 3011', 'Human Computer Interaction', 3, 'software-engineering'],
  ['CSC 3402', 'Systems Analysis and Design', 3, 'software-engineering'], ['CSC 3009', 'Research Methods', 3, 'software-engineering'],
  ['CSC 4642', 'Software Quality Assurance', 4, 'software-engineering'], ['CSC 4035', 'Distributed Systems', 4, 'software-engineering'],
  ['CSC 4631', 'Software Project Management', 4, 'software-engineering'], ['CSC 4630', 'Advanced Software Engineering', 4, 'software-engineering'],
  ['CSC 4505', 'Information Security', 4, 'software-engineering'], ['CSC 4004', 'Final Year Project', 4, 'software-engineering'],
  ['CSC 4792', 'Professional Practice', 4, 'software-engineering']
].map(([courseCode, courseName, yearOfStudy, stream]) => ({ courseCode, courseName, yearOfStudy, stream }));

const timetable = [
  { courseCode: 'CSC 3600', day: 'Monday', startTime: '08:00', endTime: '10:00', venue: 'Room X', lecturer: 'Dr. Moyo' },
  { courseCode: 'CSC 3712', day: 'Tuesday', startTime: '10:00', endTime: '12:00', venue: 'Room Y', lecturer: 'Prof. Banda' },
  { courseCode: 'CSC 2702', day: 'Wednesday', startTime: '14:00', endTime: '16:00', venue: 'Lab 2', lecturer: 'Dr. Phiri' }
];

export function createMemoryStore() {
  const confirmations = new Map();

  return {
    async listCourses() {
      return courses;
    },
    async findCourseByCode(courseCode) {
      return courses.find((course) => course.courseCode === courseCode) ?? null;
    },
    async createCourse(course) {
      const created = { courseId: courses.length + 1, ...course };
      courses = [...courses, created];
      return created;
    },
    async updateCourse(courseId, course) {
      courses = courses.map((item) => item.courseId === Number(courseId) ? { ...item, ...course, courseId: Number(courseId) } : item);
      return courses.find((item) => item.courseId === Number(courseId));
    },
    async deleteCourse(courseId) {
      courses = courses.filter((item) => item.courseId !== Number(courseId));
      return { deleted: true };
    },
    findSuggestedCourses(yearOfStudy, stream) {
      return courses.filter((course) => course.yearOfStudy === yearOfStudy && (course.stream === stream || course.stream === 'common'));
    },
    searchCourses(query) {
      const normalizedQuery = query.toLowerCase();
      return courses.filter((course) => `${course.courseCode} ${course.courseName}`.toLowerCase().includes(normalizedQuery));
    },
    findCoursesByCodes(courseCodes) {
      return courseCodes.map((code) => courses.find((course) => course.courseCode === code)).filter(Boolean);
    },
    saveConfirmation(studentId, confirmation) {
      confirmations.set(studentId, confirmation);
      return confirmation;
    },
    getConfirmation(studentId) {
      return confirmations.get(studentId) ?? null;
    },
    findTimetableEntries(courseCodes) {
      return timetable.filter((entry) => courseCodes.includes(entry.courseCode));
    }
  };
}