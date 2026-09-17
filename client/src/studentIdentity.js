export function buildStudentId(year, stream) {
  return `demo-student-${Number(year)}-${String(stream ?? 'common').trim()}`;
}
