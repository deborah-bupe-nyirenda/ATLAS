const requiredFields = ['courseCode', 'day', 'startTime', 'endTime', 'venue', 'lecturer'];

export function normalizeCourseCode(value) {
  return value.trim().toUpperCase().replace(/\s+/g, ' ').replace(/^([A-Z]{2,4})\s?(\d{4})$/, '$1 $2');
}

export function inferSemesterFromCourseCode(courseCode) {
  const suffix = normalizeCourseCode(courseCode).replace(/\D/g, '').slice(-1);
  return suffix === '1' ? 'first' : suffix === '2' ? 'second' : null;
}

export function detectTimetableFormat(source) {
  if (/FIRST\s+SESSION|SECOND\s+SESSION|NUMBER OF STUDENTS/i.test(source)) return 'exam';
  if (/MONDAY|TUESDAY|WEDNESDAY/i.test(source) && /07:00|08:00|09:00/i.test(source)) return 'lecture';
  return 'unknown';
}

function parseCsvLine(line) {
  const values = [];
  let value = '';
  let quoted = false;
  for (const character of line) {
    if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { values.push(value.trim()); value = ''; }
    else value += character;
  }
  values.push(value.trim());
  return values;
}

export function parseTimetableCsv(source) {
  const lines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error('Timetable CSV must contain a header and at least one row');
  const headers = parseCsvLine(lines[0]);
  for (const field of requiredFields) if (!headers.includes(field)) throw new Error(`Timetable CSV is missing ${field}`);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    if (!row.courseCode?.trim()) throw new Error('Every timetable row requires a courseCode');
    return { ...row, courseCode: normalizeCourseCode(row.courseCode) };
  });
}

export function parseLectureGridText(source) {
  const lines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const header = lines.find((line) => /^day(?:\||\s)/i.test(line));
  if (!header) throw new Error('Could not find lecture timetable time columns');
  const timeSlots = splitGridLine(header).slice(1).map((value) => {
    const match = value.match(/(\d{1,2}):?(\d{2})\s*-\s*(\d{1,2}):?(\d{2})/);
    return match ? { startTime: `${match[1].padStart(2, '0')}:${match[2]}`, endTime: `${match[3].padStart(2, '0')}:${match[4]}` } : null;
  });
  const entries = [];
  for (const line of lines) {
    const cells = splitGridLine(line);
    const day = cells[0]?.match(/^(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)$/i)?.[1];
    if (!day) continue;
    cells.slice(1).forEach((cell, index) => {
      const match = cell.match(/\b([A-Z]{2,8})\s?(\d{4})\b(?:\s+(LAB|TUTORIAL))?\s*(?:\(([^)]+)\))?/i);
      if (!match || !timeSlots[index]) return;
      entries.push({ timetableType: 'lecture', courseCode: normalizeCourseCode(`${match[1]} ${match[2]}`), day: capitalize(day), ...timeSlots[index], venue: match[4]?.trim().toUpperCase() ?? '', activityType: (match[3] ?? 'lecture').toLowerCase() });
    });
  }
  if (entries.length === 0) throw new Error('Could not find lecture timetable cells');
  return entries;
}

export function parseLectureLayoutText(source) {
  const lines = source.split(/\r?\n/);
  const header = lines.find((line) => /\d{1,2}[.:]\d{2}\s*[–-]\s*\d{1,2}[.:]\d{2}/.test(line));
  if (!header) throw new Error('Could not find lecture timetable time columns');
  const columns = [...header.matchAll(/(\d{1,2})[.:](\d{2})\s*[–-]\s*(\d{1,2})[.:](\d{2})/g)].map((match) => ({
    position: match.index,
    startTime: `${match[1].padStart(2, '0')}:${match[2]}`,
    endTime: `${match[3].padStart(2, '0')}:${match[4]}`
  }));
  const entries = [];
  let day = null;
  let rowsBeforeFirstDay = [];
  const parseRow = (line, activeDay) => {
    if (!activeDay || line === header) return;
    const courses = [...line.matchAll(/\b([A-Z]{2,8})\s?(\d{4})(?:\s*\/\s*(?:(?:([A-Z]{2,8})\s*)?)(\d{4}))?/gi)];
    for (const match of courses) {
      const column = [...columns].reverse().find((candidate) => candidate.position <= match.index) ?? columns[0];
      const nextCoursePosition = courses.find((candidate) => candidate.index > match.index)?.index ?? line.length;
      const cellTail = line.slice(match.index + match[0].length, nextCoursePosition);
      const venue = extractLectureVenue(cellTail);
      for (const code of courseCodesFromMatch(match)) entries.push({ timetableType: 'lecture', courseCode: code, semester: inferSemesterFromCourseCode(code), day: activeDay, startTime: column.startTime, endTime: column.endTime, venue, activityType: activityFromText(match[0]) });
    }
  };
  for (const line of lines) {
    const dayMatch = line.match(/^\s*(MON|TUE|WED|THU|FRI|SAT|SUN)(?:\s|$)/i);
    if (dayMatch) {
      day = expandDay(dayMatch[1]);
      for (const pendingLine of rowsBeforeFirstDay) parseRow(pendingLine, day);
      rowsBeforeFirstDay = [];
    }
    if (line === header) continue;
    if (!day) rowsBeforeFirstDay.push(line);
    else parseRow(line, day);
  }
  if (entries.length === 0) throw new Error('Could not find lecture timetable cells');
  return entries;
}

function courseCodesFromMatch(match) {
  return [normalizeCourseCode(`${match[1]} ${match[2]}`), match[4] ? normalizeCourseCode(`${match[3] ?? match[1]} ${match[4]}`) : null].filter(Boolean);
}

function extractLectureVenue(value) {
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  const venue = tokens.reverse().find((token) => /^[A-Z][A-Z0-9]{1,7}$/.test(token));
  return venue ? venue.toUpperCase() : '';
}

function activityFromText(value) {
  return /LAB/i.test(value) ? 'lab' : /TUTORIAL/i.test(value) ? 'tutorial' : 'lecture';
}

function expandDay(value) {
  return { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday' }[value.toUpperCase()];
}

function splitGridLine(line) {
  return line.includes('|') ? line.split('|').map((cell) => cell.trim()) : line.split(/\s{2,}/).map((cell) => cell.trim());
}

export function parseTimetableText(source) {
  const lines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rows = [];
  for (const line of lines) {
    const match = line.match(/\b([A-Z]{2,4})\s?(\d{4})\b\s*[|,-]\s*(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2}:\d{2})\s*(?:-|to)\s*(\d{1,2}:\d{2})\s*[|,-]\s*([^|,-]+)\s*[|,-]\s*(.+)$/i);
    if (match) rows.push({ courseCode: `${match[1]} ${match[2]}`.toUpperCase(), day: capitalize(match[3]), startTime: match[4], endTime: match[5], venue: match[6].trim(), lecturer: match[7].trim() });
  }
  if (rows.length === 0) throw new Error('Could not find timetable rows in the PDF text');
  return rows;
}

function capitalize(value) { return value[0].toUpperCase() + value.slice(1).toLowerCase(); }

function entryKey(entry) {
  return [entry.timetableType, entry.eventDate, entry.courseCode, entry.semester, entry.day, normalizeTime(entry.startTime), normalizeTime(entry.endTime), entry.sessionName, entry.venue, entry.lecturer, entry.activityType, entry.studentCapacity].join('|').toUpperCase();
}

function normalizeTime(value) {
  return String(value).trim().split(':').slice(0, 2).join(':').padStart(5, '0');
}

export function compareTimetableEntries(currentEntries, uploadedEntries) {
  const current = new Map(currentEntries.map((entry) => [entryKey(entry), entry]));
  const uploaded = new Map(uploadedEntries.map((entry) => [entryKey(entry), entry]));
  return {
    added: uploadedEntries.filter((entry) => !current.has(entryKey(entry))),
    removed: currentEntries.filter((entry) => !uploaded.has(entryKey(entry))),
    unchanged: uploadedEntries.filter((entry) => current.has(entryKey(entry)))
  };
}