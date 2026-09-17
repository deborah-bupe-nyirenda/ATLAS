import { inferSemesterFromCourseCode, normalizeCourseCode } from './timetableSourceProcessor.js';

const coursePattern = /^([A-Z]{2,4})\s?(\d{4})(?:\s+(.*))?$/i;
const sessionPattern = /^(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\s+(\d{1,2})(?:ST|ND|RD|TH)?\s+([A-Z]+)\s+(\d{4})\s*-\s*(?:FIRST\s*SESSION|SECOND\s*SESSION)\s*[:\-–]?\s*(\d{1,2})\s*:?\s*(\d{2})\s*(?:-|–|TO)\s*(\d{1,2})\s*:?\s*(\d{2})/i;

export function parseExamTimetableText(source) {
  const lines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const entries = [];
  let context = null;
  let pendingCourses = [];
  let pendingRows = [];

  const flush = () => {
    if (!context || pendingCourses.length === 0) return;
    const rows = pendingRows.length ? pendingRows.map((row, index, allRows) => ({ ...row, venue: row.venue || allRows[index - 1]?.venue || '' })) : [{ venue: '', studentCapacity: null }];
    const courses = pendingCourses.splice(0);
    pendingRows = [];
    if (courses.length === 1) {
      for (const row of rows) entries.push(createEntry(courses[0], context, row));
      return;
    }
    for (const [index, course] of courses.entries()) {
      const row = rows[index] ?? rows[rows.length - 1] ?? { venue: '', studentCapacity: null };
      entries.push(createEntry(course, context, row));
    }
  };

  for (const line of lines) {
    const session = line.match(sessionPattern);
    if (session) {
      flush();
      context = {
        day: capitalize(session[1]),
        eventDate: toIsoDate(Number(session[4]), monthNumber(session[3]), Number(session[2])),
        sessionName: line.toUpperCase().includes('SECOND SESSION') ? 'second' : 'first',
        startTime: `${session[5].padStart(2, '0')}:${session[6]}`,
        endTime: `${session[7].padStart(2, '0')}:${session[8]}`
      };
      continue;
    }
    if (!context || /^(COURSE|VENUE|NUMBER OF STUDENTS|\d+\s*\|\s*PAGE)/i.test(line)) continue;

    const courseMatch = line.match(coursePattern);
    if (courseMatch) {
      if (pendingRows.length) flush();
      pendingCourses.push(normalizeCourseCode(`${courseMatch[1]} ${courseMatch[2]}`));
      if (courseMatch[3]) {
        const inline = parseVenueRow(courseMatch[3]);
        if (inline) pendingRows.push(inline);
      }
      continue;
    }

    const venueRow = parseVenueRow(line);
    if (venueRow) pendingRows.push(venueRow);
  }
  flush();
  if (entries.length === 0) throw new Error('Could not find examination timetable rows in the PDF text');
  return entries;
}

export function validateTimetableEntries(entries, knownCourseCodes, { requireDate = true } = {}) {
  const unknownCourseCodes = [...new Set(entries.map((entry) => entry.courseCode).filter((code) => !knownCourseCodes.has(code)))];
  const missingVenue = entries.filter((entry) => !entry.venue).length;
  const missingDateOrTime = entries.filter((entry) => (requireDate && !entry.eventDate) || !entry.startTime || !entry.endTime).length;
  const possibleClashes = findClashes(entries);
  const blockingReasons = [];
  if (unknownCourseCodes.length > 0) blockingReasons.push(`${unknownCourseCodes.length} unknown course code${unknownCourseCodes.length === 1 ? '' : 's'}`);
  if (missingVenue > 0) blockingReasons.push(`${missingVenue} entr${missingVenue === 1 ? 'y is' : 'ies are'} missing a venue`);
  if (missingDateOrTime > 0) blockingReasons.push(`${missingDateOrTime} entr${missingDateOrTime === 1 ? 'y is' : 'ies are'} missing date or time`);
  return { rowsExtracted: entries.length, unknownCourseCodes, missingVenue, missingDateOrTime, possibleClashes, blockingReasons, canPublish: blockingReasons.length === 0 };
}

function parseVenueRow(value) {
  if (/^\d{1,4}$/.test(value.trim())) return { venue: '', studentCapacity: Number(value.trim()) };
  const match = value.match(/^(.+?)\s+(\d{1,4})$/);
  if (!match) return null;
  return { venue: match[1].trim().toUpperCase(), studentCapacity: Number(match[2]) };
}

function createEntry(courseCode, context, row) {
  return { timetableType: 'exam', courseCode, semester: inferSemesterFromCourseCode(courseCode), eventDate: context.eventDate, day: context.day, startTime: context.startTime, endTime: context.endTime, sessionName: context.sessionName, venue: row.venue, studentCapacity: row.studentCapacity, activityType: 'exam' };
}

function findClashes(entries) {
  const clashes = [];
  for (const entry of entries) {
    const clash = entries.find((other) => other !== entry && other.eventDate === entry.eventDate && other.startTime === entry.startTime && other.endTime === entry.endTime && other.courseCode !== entry.courseCode && (!entry.semester || !other.semester || entry.semester === other.semester));
    if (clash) clashes.push({ courseCode: entry.courseCode, conflictingCourseCode: clash.courseCode, eventDate: entry.eventDate, startTime: entry.startTime });
  }
  return clashes;
}

function monthNumber(month) { return new Date(`${month} 1, 2000`).getMonth() + 1; }
function toIsoDate(year, month, day) { return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`; }
function capitalize(value) { return value[0] + value.slice(1).toLowerCase(); }