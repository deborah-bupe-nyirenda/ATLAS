CREATE TABLE IF NOT EXISTS schools (
  school_id INT AUTO_INCREMENT PRIMARY KEY,
  school_name VARCHAR(150) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS departments (
  department_id INT AUTO_INCREMENT PRIMARY KEY,
  department_name VARCHAR(150) NOT NULL,
  school_id INT NOT NULL,
  CONSTRAINT fk_departments_school FOREIGN KEY (school_id) REFERENCES schools (school_id),
  UNIQUE KEY uq_department_school (department_name, school_id)
);

CREATE TABLE IF NOT EXISTS courses (
  course_id INT AUTO_INCREMENT PRIMARY KEY,
  course_code VARCHAR(20) NOT NULL UNIQUE,
  course_name VARCHAR(180) NOT NULL,
  year_of_study TINYINT NOT NULL,
  stream VARCHAR(80) NOT NULL DEFAULT 'common',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  department_id INT NOT NULL,
  CONSTRAINT fk_courses_department FOREIGN KEY (department_id) REFERENCES departments (department_id)
);

CREATE TABLE IF NOT EXISTS students (
  student_id INT AUTO_INCREMENT PRIMARY KEY,
  student_number VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  year_of_study TINYINT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'admin') NOT NULL,
  student_id INT NULL,
  CONSTRAINT fk_users_student FOREIGN KEY (student_id) REFERENCES students (student_id)
);

CREATE TABLE IF NOT EXISTS lecturers (
  lecturer_id INT AUTO_INCREMENT PRIMARY KEY,
  lecturer_number VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL
);

CREATE TABLE IF NOT EXISTS venues (
  venue_id INT AUTO_INCREMENT PRIMARY KEY,
  venue_code VARCHAR(40) NOT NULL UNIQUE,
  venue_name VARCHAR(120) NOT NULL,
  capacity INT
);

CREATE TABLE IF NOT EXISTS timetables (
  timetable_id INT AUTO_INCREMENT PRIMARY KEY,
  timetable_name VARCHAR(120) NOT NULL DEFAULT 'Department timetable'
);

CREATE TABLE IF NOT EXISTS timetable_revisions (
  revision_id INT AUTO_INCREMENT PRIMARY KEY,
  timetable_id INT NOT NULL,
  revision_number INT NOT NULL,
  revision_date DATETIME NOT NULL,
  timetable_type ENUM('lecture', 'exam') NOT NULL DEFAULT 'lecture',
  status ENUM('draft', 'current', 'archived') NOT NULL DEFAULT 'draft',
  CONSTRAINT fk_revisions_timetable FOREIGN KEY (timetable_id) REFERENCES timetables (timetable_id),
  UNIQUE KEY uq_timetable_revision (timetable_id, revision_number)
);

CREATE TABLE IF NOT EXISTS timetable_entries (
  entry_id INT AUTO_INCREMENT PRIMARY KEY,
  revision_id INT NOT NULL,
  course_id INT NOT NULL,
  venue_id INT NOT NULL,
  lecturer_id INT NULL,
  day ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
  event_date DATE NULL,
  semester ENUM('first', 'second') NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  session_name VARCHAR(30) NULL,
  activity_type VARCHAR(30) NULL,
  student_capacity INT NULL,
  CONSTRAINT fk_entries_revision FOREIGN KEY (revision_id) REFERENCES timetable_revisions (revision_id),
  CONSTRAINT fk_entries_course FOREIGN KEY (course_id) REFERENCES courses (course_id),
  CONSTRAINT fk_entries_venue FOREIGN KEY (venue_id) REFERENCES venues (venue_id),
  CONSTRAINT fk_entries_lecturer FOREIGN KEY (lecturer_id) REFERENCES lecturers (lecturer_id),
  UNIQUE KEY uq_timetable_entry (revision_id, course_id, venue_id, lecturer_id, day, event_date, semester, start_time, end_time)
);

CREATE TABLE IF NOT EXISTS course_confirmations (
  confirmation_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  academic_year INT NOT NULL,
  semester VARCHAR(20) NOT NULL,
  status ENUM('draft', 'confirmed', 'cancelled') NOT NULL DEFAULT 'draft',
  confirmation_date DATETIME NOT NULL,
  CONSTRAINT fk_confirmations_student FOREIGN KEY (student_id) REFERENCES students (student_id)
);

CREATE TABLE IF NOT EXISTS course_confirmation_courses (
  confirmation_id INT NOT NULL,
  course_id INT NOT NULL,
  carry_or_repeat BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (confirmation_id, course_id),
  CONSTRAINT fk_confirmation_courses_confirmation FOREIGN KEY (confirmation_id) REFERENCES course_confirmations (confirmation_id),
  CONSTRAINT fk_confirmation_courses_course FOREIGN KEY (course_id) REFERENCES courses (course_id)
);