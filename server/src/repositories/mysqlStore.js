function placeholders(values) {
  return values.map(() => '?').join(', ');
}

function toMysqlDateTime(value) {
  return new Date(value).toISOString().slice(0, 19).replace('T', ' ');
}

export function createMysqlStore(pool) {
  return {
    async listCourses() {
      const [rows] = await pool.execute('SELECT course_id AS courseId, course_code AS courseCode, course_name AS courseName, year_of_study AS yearOfStudy, stream FROM courses WHERE active = TRUE ORDER BY course_code');
      return rows;
    },
    async findCourseByCode(courseCode) {
      const [rows] = await pool.execute('SELECT course_id AS courseId, course_code AS courseCode, course_name AS courseName, year_of_study AS yearOfStudy, stream FROM courses WHERE course_code = ? AND active = TRUE', [courseCode]);
      return rows[0] ?? null;
    },
    async createCourse(course) {
      const [result] = await pool.execute(
        `INSERT INTO courses (course_code, course_name, year_of_study, stream, department_id)
         VALUES (?, ?, ?, ?, (SELECT department_id FROM departments ORDER BY department_id LIMIT 1))`,
        [course.courseCode, course.courseName, course.yearOfStudy, course.stream]
      );
      return { courseId: result.insertId, ...course };
    },
    async updateCourse(courseId, course) {
      await pool.execute('UPDATE courses SET course_code = ?, course_name = ?, year_of_study = ?, stream = ? WHERE course_id = ?', [course.courseCode, course.courseName, course.yearOfStudy, course.stream, courseId]);
      return { courseId: Number(courseId), ...course };
    },
    async deleteCourse(courseId) {
      await pool.execute('DELETE FROM courses WHERE course_id = ?', [courseId]);
      return { deleted: true };
    },
    async findUserByUsername(username) {
      const [rows] = await pool.execute('SELECT user_id AS userId, username, password_hash AS passwordHash, role FROM users WHERE username = ?', [username]);
      return rows[0] ?? null;
    },
    async findSuggestedCourses(yearOfStudy, stream) {
      const [rows] = await pool.execute(
        `SELECT course_code AS courseCode, course_name AS courseName, year_of_study AS yearOfStudy, stream
         FROM courses WHERE active = TRUE AND year_of_study = ? AND (stream = ? OR stream = 'common' OR stream = 'all-streams' OR CONCAT('|', stream, '|') LIKE CONCAT('%|', ?, '|%')) ORDER BY course_code`,
        [yearOfStudy, stream, stream]
      );
      return rows;
    },
    async searchCourses(query) {
      const pattern = `%${query ?? ''}%`;
      const [rows] = await pool.execute(
        `SELECT course_code AS courseCode, course_name AS courseName, year_of_study AS yearOfStudy, stream
         FROM courses WHERE active = TRUE AND (course_code LIKE ? OR course_name LIKE ?) ORDER BY course_code`,
        [pattern, pattern]
      );
      return rows;
    },
    async findCoursesByCodes(courseCodes) {
      if (courseCodes.length === 0) return [];
      const [rows] = await pool.execute(
        `SELECT course_id AS courseId, course_code AS courseCode, course_name AS courseName, year_of_study AS yearOfStudy, stream
         FROM courses WHERE course_code IN (${placeholders(courseCodes)})`,
        courseCodes
      );
      return courseCodes.map((code) => rows.find((course) => course.courseCode === code)).filter(Boolean);
    },
    async saveConfirmation(studentId, confirmation) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        let [studentRows] = await connection.execute('SELECT student_id AS studentId FROM students WHERE student_number = ?', [studentId]);
        let studentIdValue = studentRows[0]?.studentId;

        if (!studentIdValue) {
          const studentYear = Number(
            confirmation.courses.find((course) => Number.isFinite(Number(course.yearOfStudy)))?.yearOfStudy ?? 1
          ) || 1;

          await connection.execute(
            `INSERT INTO students (student_number, name, year_of_study)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE student_id = LAST_INSERT_ID(student_id)`,
            [studentId, 'Demo Student', studentYear]
          );

          [studentRows] = await connection.execute('SELECT student_id AS studentId FROM students WHERE student_number = ?', [studentId]);
          studentIdValue = studentRows[0]?.studentId;
        }

        if (!studentIdValue) throw new Error('Student could not be found');

        const [confirmationResult] = await connection.execute(
          `INSERT INTO course_confirmations (student_id, academic_year, semester, status, confirmation_date)
           VALUES (?, ?, ?, 'confirmed', ?)`
          , [studentIdValue, confirmation.academicYear, confirmation.semester, toMysqlDateTime(confirmation.confirmationDate)]
        );
        for (const course of confirmation.courses) {
          const [courseRows] = await connection.execute('SELECT course_id AS courseId FROM courses WHERE course_code = ?', [course.courseCode]);
          await connection.execute(
            `INSERT INTO course_confirmation_courses (confirmation_id, course_id, carry_or_repeat) VALUES (?, ?, ?)`,
            [confirmationResult.insertId, courseRows[0].courseId, course.carryOrRepeat]
          );
        }
        await connection.commit();
        return confirmation;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
    async getConfirmation(studentId) {
      const [rows] = await pool.execute(
        `SELECT cc.academic_year AS academicYear, cc.semester, cc.status, cc.confirmation_date AS confirmationDate,
                c.course_code AS courseCode, c.course_name AS courseName, c.year_of_study AS yearOfStudy, c.stream,
                ccc.carry_or_repeat AS carryOrRepeat
         FROM course_confirmations cc
         JOIN students s ON s.student_id = cc.student_id
         JOIN course_confirmation_courses ccc ON ccc.confirmation_id = cc.confirmation_id
         JOIN courses c ON c.course_id = ccc.course_id
         WHERE s.student_number = ? AND cc.status = 'confirmed'
         ORDER BY cc.confirmation_date DESC, c.course_code`,
        [studentId]
      );
      if (rows.length === 0) return null;
      const first = rows[0];
      return { studentId, academicYear: first.academicYear, semester: first.semester, status: first.status, confirmationDate: first.confirmationDate, courses: rows.map(({ courseCode, courseName, yearOfStudy, stream, carryOrRepeat }) => ({ courseCode, courseName, yearOfStudy, stream, carryOrRepeat: Boolean(carryOrRepeat) })) };
    },
    async findTimetableEntries(courseCodes) {
      if (courseCodes.length === 0) return [];
      const [rows] = await pool.execute(
        `SELECT c.course_code AS courseCode, te.day, te.start_time AS startTime, te.end_time AS endTime,
                v.venue_name AS venue, l.name AS lecturer, te.event_date AS eventDate, te.semester,
                tr.timetable_type AS timetableType, te.session_name AS sessionName,
                te.activity_type AS activityType, te.student_capacity AS studentCapacity
         FROM timetable_entries te
         JOIN courses c ON c.course_id = te.course_id
         JOIN venues v ON v.venue_id = te.venue_id
         LEFT JOIN lecturers l ON l.lecturer_id = te.lecturer_id
         JOIN timetable_revisions tr ON tr.revision_id = te.revision_id
         WHERE tr.status = 'current' AND c.course_code IN (${placeholders(courseCodes)})
         ORDER BY FIELD(c.course_code, ${placeholders(courseCodes)}), te.day, te.start_time`,
        [...courseCodes, ...courseCodes]
      );
      return rows;
    },
    async findCurrentTimetable() {
      const [rows] = await pool.execute(
        `SELECT c.course_code AS courseCode, te.day, te.start_time AS startTime, te.end_time AS endTime,
                v.venue_name AS venue, l.name AS lecturer, te.event_date AS eventDate, te.semester,
                tr.timetable_type AS timetableType, te.session_name AS sessionName,
                te.activity_type AS activityType, te.student_capacity AS studentCapacity
         FROM timetable_entries te
         JOIN courses c ON c.course_id = te.course_id
         JOIN venues v ON v.venue_id = te.venue_id
         LEFT JOIN lecturers l ON l.lecturer_id = te.lecturer_id
         JOIN timetable_revisions tr ON tr.revision_id = te.revision_id
         WHERE tr.status = 'current' ORDER BY te.day, te.start_time, c.course_code`
      );
      return rows;
    },
    async saveTimetableRevision(entries) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [timetableRows] = await connection.execute('SELECT timetable_id AS timetableId FROM timetables ORDER BY timetable_id LIMIT 1');
        const timetableId = timetableRows[0]?.timetableId;
        if (!timetableId) throw new Error('No timetable exists');
        const [numberRows] = await connection.execute('SELECT COALESCE(MAX(revision_number), 0) + 1 AS revisionNumber FROM timetable_revisions WHERE timetable_id = ?', [timetableId]);
        const revisionNumber = numberRows[0].revisionNumber;
        await connection.execute("UPDATE timetable_revisions SET status = 'archived' WHERE timetable_id = ? AND status = 'current'", [timetableId]);
        const [revisionResult] = await connection.execute(
          `INSERT INTO timetable_revisions (timetable_id, revision_number, revision_date, timetable_type, status)
           VALUES (?, ?, UTC_TIMESTAMP(), ?, 'current')`, [timetableId, revisionNumber, entries[0]?.timetableType ?? 'lecture']
        );
        for (const entry of entries) {
          const [courseRows] = await connection.execute('SELECT course_id AS courseId FROM courses WHERE course_code = ?', [entry.courseCode]);
          if (!courseRows[0]) throw new Error(`unknown course code: ${entry.courseCode}`);
          await connection.execute('INSERT INTO venues (venue_code, venue_name) VALUES (?, ?) ON DUPLICATE KEY UPDATE venue_id = LAST_INSERT_ID(venue_id)', [entry.venue, entry.venue]);
          const [venueRows] = await connection.execute('SELECT venue_id AS venueId FROM venues WHERE venue_code = ?', [entry.venue]);
          let lecturerId = null;
          if (entry.lecturer) {
            await connection.execute('INSERT INTO lecturers (lecturer_number, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE lecturer_id = LAST_INSERT_ID(lecturer_id)', [entry.lecturer, entry.lecturer]);
            const [lecturerRows] = await connection.execute('SELECT lecturer_id AS lecturerId FROM lecturers WHERE lecturer_number = ?', [entry.lecturer]);
            lecturerId = lecturerRows[0].lecturerId;
          }
          await connection.execute(
            `INSERT INTO timetable_entries (revision_id, course_id, venue_id, lecturer_id, day, event_date, semester, start_time, end_time, session_name, activity_type, student_capacity)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [revisionResult.insertId, courseRows[0].courseId, venueRows[0].venueId, lecturerId, entry.day, entry.eventDate ?? null, entry.semester ?? null, entry.startTime, entry.endTime, entry.sessionName ?? null, entry.activityType ?? null, entry.studentCapacity ?? null]
          );
        }
        await connection.commit();
        return { revisionNumber, status: 'current' };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }
  };
}