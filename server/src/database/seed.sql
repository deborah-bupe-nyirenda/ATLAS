INSERT IGNORE INTO schools (school_id, school_name) VALUES (1, 'School of Computing and Informatics');
INSERT IGNORE INTO departments (department_id, department_name, school_id) VALUES (1, 'Department of Computing and Informatics', 1);

INSERT IGNORE INTO courses (course_code, course_name, year_of_study, stream, department_id) VALUES
('PHY 1010', 'Physics', 1, 'common', 1), ('CHE 1000', 'Chemistry', 1, 'common', 1), ('BIO 1401', 'Biology', 1, 'common', 1), ('BIO 1412', 'Biology II', 1, 'common', 1), ('MAT 1100', 'Mathematics', 1, 'common', 1),
('CSC 2901', 'Computing Fundamentals', 2, 'common', 1), ('CSC 2101', 'Computer Architecture', 2, 'common', 1), ('CSC 2111', 'Data Structures', 2, 'common', 1), ('CSC 2702', 'Database & Information Management', 2, 'common', 1), ('CSC 2202', 'Operating Systems', 2, 'common', 1), ('CSC 2000', 'Object-Oriented Programming', 2, 'common', 1), ('CSC 2912', 'Discrete Mathematics', 2, 'common', 1),
('CSC 3801', 'Data Communication & Networks', 3, 'software-engineering', 1), ('CSC 3600', 'Software Engineering', 3, 'software-engineering', 1), ('CSC 3301', 'Programming Languages Design', 3, 'software-engineering', 1), ('CSC 3612', 'IT Project Management', 3, 'software-engineering', 1), ('CSC 3712', 'Advanced Databases', 3, 'software-engineering', 1), ('CSC 3011', 'Human Computer Interaction', 3, 'software-engineering', 1), ('CSC 3402', 'Systems Analysis and Design', 3, 'software-engineering', 1), ('CSC 3009', 'Research Methods', 3, 'software-engineering', 1),
('CSC 4642', 'Software Quality Assurance', 4, 'software-engineering', 1), ('CSC 4035', 'Distributed Systems', 4, 'software-engineering', 1), ('CSC 4631', 'Software Project Management', 4, 'software-engineering', 1), ('CSC 4630', 'Advanced Software Engineering', 4, 'software-engineering', 1), ('CSC 4505', 'Information Security', 4, 'software-engineering', 1), ('CSC 4004', 'Final Year Project', 4, 'software-engineering', 1), ('CSC 4792', 'Professional Practice', 4, 'software-engineering', 1);

INSERT IGNORE INTO students (student_number, name, year_of_study) VALUES ('demo-student', 'Demo Student', 3);
INSERT IGNORE INTO users (username, password_hash, role, student_id)
SELECT 'admin', '$2b$10$vUrbWrO/10WM2ljMCU2/A.G/iPbxirb1/6dZ.MyIWDZ.ZDZEnuge6', 'admin', NULL
UNION ALL
SELECT 'student', '$2b$10$7y3h/RtJOkG/Xa2Pvx7.2uqp4tDXKIFbF4hqMUFs6p4tf6pf7e2RC', 'student', student_id FROM students WHERE student_number = 'demo-student';
INSERT IGNORE INTO lecturers (lecturer_number, name) VALUES ('LEC-001', 'Dr. Moyo'), ('LEC-002', 'Prof. Banda'), ('LEC-003', 'Dr. Phiri');
INSERT IGNORE INTO venues (venue_code, venue_name, capacity) VALUES ('ROOM-X', 'Room X', 80), ('ROOM-Y', 'Room Y', 80), ('LAB-2', 'Lab 2', 40);
INSERT IGNORE INTO timetables (timetable_id, timetable_name) VALUES (1, 'Department timetable');
INSERT IGNORE INTO timetable_revisions (timetable_id, revision_number, revision_date, status) VALUES (1, 1, '2026-09-01 08:00:00', 'current');
DELETE FROM timetable_entries WHERE revision_id = 1;
INSERT IGNORE INTO timetable_entries (revision_id, course_id, venue_id, lecturer_id, day, start_time, end_time)
SELECT 1, c.course_id, v.venue_id, l.lecturer_id, 'Monday', '08:00:00', '10:00:00' FROM courses c JOIN venues v ON v.venue_code = 'ROOM-X' JOIN lecturers l ON l.lecturer_number = 'LEC-001' WHERE c.course_code = 'CSC 3600';
INSERT IGNORE INTO timetable_entries (revision_id, course_id, venue_id, lecturer_id, day, start_time, end_time)
SELECT 1, c.course_id, v.venue_id, l.lecturer_id, 'Tuesday', '10:00:00', '12:00:00' FROM courses c JOIN venues v ON v.venue_code = 'ROOM-Y' JOIN lecturers l ON l.lecturer_number = 'LEC-002' WHERE c.course_code = 'CSC 3712';
INSERT IGNORE INTO timetable_entries (revision_id, course_id, venue_id, lecturer_id, day, start_time, end_time)
SELECT 1, c.course_id, v.venue_id, l.lecturer_id, 'Wednesday', '14:00:00', '16:00:00' FROM courses c JOIN venues v ON v.venue_code = 'LAB-2' JOIN lecturers l ON l.lecturer_number = 'LEC-003' WHERE c.course_code = 'CSC 2702';