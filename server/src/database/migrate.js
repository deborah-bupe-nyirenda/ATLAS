import 'dotenv/config';
import fs from 'node:fs/promises';
import mysql from 'mysql2/promise';

const databaseName = process.env.DB_NAME ?? 'atlas_db';
const connection = await mysql.createConnection({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  multipleStatements: true
});

try {
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
  await connection.changeUser({ database: databaseName });
  await connection.query(await fs.readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
  for (const statement of [
    "ALTER TABLE timetable_revisions ADD COLUMN timetable_type ENUM('lecture', 'exam') NOT NULL DEFAULT 'lecture'",
    'ALTER TABLE timetable_entries MODIFY lecturer_id INT NULL',
    'ALTER TABLE timetable_entries ADD COLUMN event_date DATE NULL',
    "ALTER TABLE timetable_entries ADD COLUMN semester ENUM('first', 'second') NULL",
    'ALTER TABLE courses ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE',
    'ALTER TABLE timetable_entries ADD COLUMN session_name VARCHAR(30) NULL',
    'ALTER TABLE timetable_entries ADD COLUMN activity_type VARCHAR(30) NULL',
    'ALTER TABLE timetable_entries ADD COLUMN student_capacity INT NULL'
  ]) {
    try { await connection.query(statement); } catch (error) {
      if (!['ER_DUP_FIELDNAME', 'ER_DUP_COLUMN_NAME'].includes(error.code)) throw error;
    }
  }
  await connection.query(await fs.readFile(new URL('./seed.sql', import.meta.url), 'utf8'));
  console.log(`ATLAS database ready: ${databaseName}`);
} finally {
  await connection.end();
}