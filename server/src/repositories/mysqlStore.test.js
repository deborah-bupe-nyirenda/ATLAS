import test from 'node:test';
import assert from 'node:assert/strict';
import { createMysqlStore } from './mysqlStore.js';

test('mysql store uses the course and timetable repository contract', async () => {
  const calls = [];
  const pool = {
    async execute(sql, values) {
      calls.push({ sql, values });
      if (sql.includes('FROM courses')) return [[{ courseCode: 'CSC 3600', courseName: 'Software Engineering', yearOfStudy: 3, stream: 'software-engineering' }]];
      if (sql.includes('SELECT course_id')) return [[{ courseId: 7, courseCode: 'CSC 3600', courseName: 'Software Engineering', yearOfStudy: 3, stream: 'software-engineering' }]];
      if (sql.includes('FROM course_confirmations')) return [[{ confirmationId: 4, academicYear: 2026, semester: '1', status: 'confirmed', confirmationDate: '2026-09-17T00:00:00.000Z', courseCode: 'CSC 3600', carryOrRepeat: 0 }]];
      if (sql.includes('FROM timetable_entries')) return [[{ courseCode: 'CSC 3600', day: 'Monday', startTime: '08:00:00', endTime: '10:00:00', venue: 'Room X', lecturer: 'Dr. Moyo' }]];
      return [{ insertId: 12 }];
    },
    async getConnection() {
      return { beginTransaction() {}, commit() {}, rollback() {}, release() {}, execute: this.execute.bind(this) };
    }
  };
  const store = createMysqlStore(pool);

  assert.deepEqual(await store.findSuggestedCourses(3, 'software-engineering'), [{ courseCode: 'CSC 3600', courseName: 'Software Engineering', yearOfStudy: 3, stream: 'software-engineering' }]);
  assert.deepEqual(await store.findTimetableEntries(['CSC 3600']), [{ courseCode: 'CSC 3600', day: 'Monday', startTime: '08:00:00', endTime: '10:00:00', venue: 'Room X', lecturer: 'Dr. Moyo' }]);
  assert.ok(calls.every(({ sql }) => sql.includes('FROM') || sql.includes('INSERT')));
});

test('mysql store converts ISO confirmation dates to MySQL DATETIME values', async () => {
  const calls = [];
  const pool = {
    async execute(sql, values) {
      calls.push({ sql, values });
      if (sql.includes('FROM students')) return [[{ studentId: 1 }]];
      if (sql.includes('INSERT INTO course_confirmations')) return [{ insertId: 2 }];
      if (sql.includes('FROM courses')) return [[{ courseId: 7 }]];
      return [[]];
    },
    async getConnection() {
      return { beginTransaction() {}, commit() {}, rollback() {}, release() {}, execute: this.execute.bind(this) };
    }
  };
  const store = createMysqlStore(pool);

  await store.saveConfirmation('demo-student', {
    academicYear: 2026,
    semester: '1',
    confirmationDate: '2026-09-17T13:52:21.211Z',
    courses: [{ courseCode: 'CSC 3600', carryOrRepeat: false }]
  });

  const insertCall = calls.find(({ sql }) => sql.includes('INSERT INTO course_confirmations'));
  assert.equal(insertCall.values[3], '2026-09-17 13:52:21');
});

test('mysql store creates a demo student record when one does not already exist', async () => {
  const calls = [];
  const pool = {
    async execute(sql, values) {
      calls.push({ sql, values });
      if (sql.includes('FROM students') && sql.includes('WHERE student_number = ?')) return [[]];
      if (sql.includes('INSERT INTO students')) return [{ insertId: 99 }];
      if (sql.includes('INSERT INTO course_confirmations')) return [{ insertId: 2 }];
      if (sql.includes('FROM courses')) return [[{ courseId: 7 }]];
      return [[]];
    },
    async getConnection() {
      return { beginTransaction() {}, commit() {}, rollback() {}, release() {}, execute: this.execute.bind(this) };
    }
  };
  const store = createMysqlStore(pool);

  await store.saveConfirmation('demo-student-3-software-engineering', {
    academicYear: 2026,
    semester: '1',
    confirmationDate: '2026-09-17T13:52:21.211Z',
    courses: [{ courseCode: 'CSC 3600', carryOrRepeat: false, yearOfStudy: 3 }]
  });

  const createdStudentCall = calls.find(({ sql }) => sql.includes('INSERT INTO students'));
  assert.ok(createdStudentCall);
  assert.equal(createdStudentCall.values[0], 'demo-student-3-software-engineering');
});