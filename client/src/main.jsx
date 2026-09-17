import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

async function request(path, options) {
  const response = await fetch(`${API_URL}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  const body = await response.text();
  let data;
  try { data = body ? JSON.parse(body) : null; } catch { data = null; }
  if (!response.ok) throw new Error(data?.error ?? `Request failed (${response.status})`);
  return data;
}

function StudentView({ onBack }) {
  const [year, setYear] = useState(3);
  const [stream, setStream] = useState('software-engineering');
  const [selected, setSelected] = useState([]);
  const [carryCodes, setCarryCodes] = useState([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    request(`/student/courses/suggested?year=${year}&stream=${stream}`).then(setSelected).catch((error) => setMessage(error.message));
  }, [year, stream]);

  async function searchCourses(event) {
    event.preventDefault();
    setResults(await request(`/courses/search?q=${encodeURIComponent(search)}`));
  }

  function addCarry(course) {
    if (!selected.some((item) => item.courseCode === course.courseCode)) setSelected((items) => [...items, course]);
    setCarryCodes((codes) => codes.includes(course.courseCode) ? codes : [...codes, course.courseCode]);
    setSearch('');
    setResults([]);
  }

  function removeCourse(courseCode) {
    setSelected((items) => items.filter((item) => item.courseCode !== courseCode));
    setCarryCodes((codes) => codes.filter((code) => code !== courseCode));
  }

  async function confirmCourses() {
    const confirmation = await request('/student/courses/confirm', {
      method: 'POST',
      body: JSON.stringify({ studentId: 'demo-student', academicYear: 2026, semester: '1', courseCodes: selected.map((course) => course.courseCode), carryOrRepeatCodes: carryCodes })
    });
    setMessage(`${confirmation.courses.length} courses confirmed`);
    setTimetable(await request('/student/timetable?studentId=demo-student'));
  }

  return <main className="shell">
    <header className="masthead"><button className="back" onClick={onBack}>← Roles</button><div className="brand-mark">A</div><div><p className="eyebrow">Student view</p><h1>Confirm your courses.</h1></div><span className="prototype">PROTOTYPE</span></header>
    <section className="controls"><label>Year of study<select value={year} onChange={(event) => setYear(event.target.value)}><option value="1">Year 1</option><option value="2">Year 2</option><option value="3">Year 3</option><option value="4">Year 4</option></select></label><label>Programme stream<select value={stream} onChange={(event) => setStream(event.target.value)}><option value="common">Common</option><option value="software-engineering">Software Engineering</option></select></label></section>
    <div className="workspace"><section className="panel courses"><div className="panel-heading"><div><p className="eyebrow">Step 01</p><h2>Suggested courses</h2></div><span className="count">{selected.length} selected</span></div><div className="course-list">{selected.map((course) => <article className="course-row" key={course.courseCode}><div className="course-code">{course.courseCode}</div><div className="course-name">{course.courseName}{carryCodes.includes(course.courseCode) && <span className="tag">Carry / repeat</span>}</div><button className="remove" onClick={() => removeCourse(course.courseCode)} aria-label={`Remove ${course.courseCode}`}>Remove</button></article>)}</div><button className="primary" onClick={confirmCourses}>Confirm courses <span>→</span></button>{message && <p className="status">{message}</p>}</section><aside className="panel add"><p className="eyebrow">Step 02</p><h2>Need a carry course?</h2><p className="muted">Search the catalogue and add it to this confirmation.</p><form onSubmit={searchCourses} className="search"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Course code or name"/><button aria-label="Search courses">⌕</button></form><div className="search-results">{results.map((course) => <div className="result" key={course.courseCode}><div><strong>{course.courseCode}</strong><span>{course.courseName}</span></div><button onClick={() => addCarry(course)}>+ Add</button></div>)}</div></aside></div>
    <section className="timetable"><div className="panel-heading"><div><p className="eyebrow">After confirmation</p><h2>My timetable</h2></div><span className="muted">Current revision · prototype data</span></div>{timetable.length === 0 ? <p className="empty">Confirm your courses to see matching timetable entries.</p> : <div className="schedule">{timetable.map((entry) => <article className="schedule-row" key={entry.courseCode}><div className="day">{entry.day}</div><div className="time">{entry.startTime}<br /><span>{entry.endTime}</span></div><div><strong>{entry.courseCode}</strong><p>{entry.venue} · {entry.lecturer}</p></div></article>)}</div>}</section>
  </main>;
}

function AdminView({ onBack, token }) {
  const [entries, setEntries] = useState([]);
  const [courses, setCourses] = useState([]);
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [changes, setChanges] = useState(null);
  const [preview, setPreview] = useState(null);
  const [courseForm, setCourseForm] = useState({ courseCode: '', courseName: '', yearOfStudy: '1', stream: 'common' });

  const authHeaders = { Authorization: `Bearer ${token}` };
  useEffect(() => { request('/admin/timetable', { headers: authHeaders }).then(setEntries).catch((error) => setMessage(error.message)); request('/admin/courses', { headers: authHeaders }).then(setCourses).catch((error) => setMessage(error.message)); }, []);

  async function addCourse(event) {
    event.preventDefault();
    const response = await request('/admin/courses', { method: 'POST', headers: authHeaders, body: JSON.stringify(courseForm) });
    setCourses((items) => [...items, response].sort((first, second) => first.courseCode.localeCompare(second.courseCode)));
    setCourseForm({ courseCode: '', courseName: '', yearOfStudy: '1', stream: 'common' });
    setMessage(`${response.courseCode} added to the catalogue`);
  }

  async function previewRevision(event) {
    event.preventDefault();
    const formData = new FormData();
    formData.append('timetable', file);
    const response = await fetch(`${API_URL}/admin/timetable/preview`, { method: 'POST', headers: authHeaders, body: formData });
    const body = await response.json();
    if (!response.ok) { setMessage(body.error); return; }
    setPreview(body);
    setChanges(body.changes);
    setMessage('Preview ready. Review the extraction before publishing.');
  }

  async function publishRevision() {
    const formData = new FormData();
    formData.append('timetable', file);
    const response = await fetch(`${API_URL}/admin/timetable/revisions`, { method: 'POST', headers: authHeaders, body: formData });
    const body = await response.json();
    if (!response.ok) { setMessage(body.error); return; }
    setEntries(await request('/admin/timetable', { headers: authHeaders }));
    setChanges(body.changes);
    setMessage(`Revision ${body.revision.revisionNumber} is now current`);
  }

    const publishedType = entries.find((entry) => entry.timetableType)?.timetableType ?? 'lecture';
    const blockingReasons = preview?.validation.blockingReasons ?? [];
    return <main className="shell"><header className="masthead"><button className="back" onClick={onBack}>← Roles</button><div className="brand-mark">A</div><div><p className="eyebrow">Administrator view</p><h1>Manage timetable.</h1></div><span className="prototype">PROTOTYPE</span></header><section className="admin-grid"><section className="panel published-panel"><div className="panel-heading"><div><p className="eyebrow">Current revision</p><h2>Published timetable</h2></div><span className="format-badge">{publishedType}</span></div>{entries.length === 0 ? <p className="empty">No timetable has been published.</p> : <div className="published-table-wrap"><table className="published-table"><thead><tr><th>Course code</th><th>Date / day</th><th>Session</th><th>Time</th><th>Semester</th><th>Venue</th><th>Activity</th><th>Capacity</th></tr></thead><tbody>{entries.map((entry, index) => <tr key={`${entry.courseCode}-${entry.day}-${index}`}><td><strong>{entry.courseCode}</strong></td><td>{entry.eventDate || entry.day}</td><td>{entry.sessionName || '—'}</td><td>{entry.startTime}–{entry.endTime}</td><td>{entry.semester || '—'}</td><td>{entry.venue || '—'}</td><td>{entry.activityType || 'lecture'}</td><td>{entry.studentCapacity ?? '—'}</td></tr>)}</tbody></table></div>}</section><section className="panel add"><p className="eyebrow">Revision workflow</p><h2>Upload timetable</h2><p className="muted">Use a CSV or PDF timetable. Rows are matched by course code, never course name.</p><form onSubmit={previewRevision} className="upload-form"><input type="file" accept=".csv,.pdf,text/csv,application/pdf" onChange={(event) => { setFile(event.target.files[0]); setPreview(null); }}/><button className="primary" disabled={!file}>Preview extraction <span>→</span></button></form>{message && <p className="status">{message}</p>}{preview && <div className="preview-summary"><strong>Detected format: {preview.format}</strong><span>{preview.validation.rowsExtracted} rows · {preview.validation.unknownCourseCodes.length} unknown course codes · {preview.validation.missingVenue} missing venues · {preview.validation.possibleClashes.length} possible clashes</span>{preview.validation.unknownCourseCodes.length > 0 && <span className="warning">Unknown: {preview.validation.unknownCourseCodes.join(', ')}</span>}<button className="primary" disabled={!preview.validation.canPublish} onClick={publishRevision}>Publish revision <span>→</span></button></div>}{changes && <div className="change-summary"><strong>Changes applied</strong><span>{changes.added.length} added · {changes.removed.length} removed · {changes.unchanged.length} unchanged</span></div>}</section></section></main>;
}

function CourseCatalogueView({ onBack, token }) {
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({ courseCode: '', courseName: '', yearOfStudy: '1', stream: 'common' });
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => { request('/admin/courses', { headers }).then(setCourses).catch((error) => setMessage(error.message)); }, []);

  async function submit(event) {
    event.preventDefault();
    try {
      const course = await request('/admin/courses', { method: 'POST', headers, body: JSON.stringify(form) });
      const updatedCourses = await request('/admin/courses', { headers });
      setCourses(updatedCourses);
      setForm({ courseCode: '', courseName: '', yearOfStudy: '1', stream: 'common' });
      setMessage(`${course?.courseCode ?? form.courseCode} added to the catalogue`);
    } catch (error) { setMessage(error.message); }
  }

  function beginEdit(course) {
    setEditingId(course.courseId);
    setForm({ courseCode: course.courseCode, courseName: course.courseName, yearOfStudy: String(course.yearOfStudy), stream: course.stream });
  }

  async function saveEdit(event) {
    event.preventDefault();
    try {
      const course = await request(`/admin/courses/${editingId}`, { method: 'PUT', headers, body: JSON.stringify(form) });
      setCourses(await request('/admin/courses', { headers }));
      setEditingId(null);
      setForm({ courseCode: '', courseName: '', yearOfStudy: '1', stream: 'common' });
      setMessage(`${course.courseCode} updated`);
    } catch (error) { setMessage(error.message); }
  }

  async function removeCourse(course) {
    if (!window.confirm(`Delete ${course.courseCode}?`)) return;
    try {
      await request(`/admin/courses/${course.courseId}`, { method: 'DELETE', headers });
      setCourses((items) => items.filter((item) => item.courseId !== course.courseId));
      setMessage(`${course.courseCode} deleted`);
    } catch (error) { setMessage(error.message); }
  }

  return <main className="shell"><header className="masthead"><button className="back" onClick={onBack}>← Roles</button><div className="brand-mark">A</div><div><p className="eyebrow">Administrator view</p><h1>Course catalogue.</h1></div><span className="prototype">PROTOTYPE</span></header><section className="admin-grid catalogue-grid"><section className="panel add"><p className="eyebrow">Course identity</p><h2>{editingId ? 'Edit course' : 'Add a course'}</h2><p className="muted">Course codes are the identity used by timetable ingestion. Names are descriptive only.</p><form className="catalogue-form" onSubmit={editingId ? saveEdit : submit}><input required value={form.courseCode} onChange={(event) => setForm({ ...form, courseCode: event.target.value })} placeholder="Course code e.g. CSC2901"/><input required value={form.courseName} onChange={(event) => setForm({ ...form, courseName: event.target.value })} placeholder="Course name"/><select value={form.yearOfStudy} onChange={(event) => setForm({ ...form, yearOfStudy: event.target.value })}><option value="1">Year 1</option><option value="2">Year 2</option><option value="3">Year 3</option><option value="4">Year 4</option></select><select value={form.stream} onChange={(event) => setForm({ ...form, stream: event.target.value })}><option value="common">Common</option><option value="software-engineering">Software Engineering</option></select><button className="primary" type="submit">{editingId ? 'Save changes' : 'Add course'} <span>→</span></button>{editingId && <button className="secondary" type="button" onClick={() => { setEditingId(null); setForm({ courseCode: '', courseName: '', yearOfStudy: '1', stream: 'common' }); }}>Cancel</button>}</form>{message && <p className="status">{message}</p>}</section><section className="panel published-panel"><div className="panel-heading"><div><p className="eyebrow">Catalogue</p><h2>{courses.length} courses</h2></div></div><div className="course-list catalogue-list">{courses.map((course) => <article className="course-row" key={course.courseId}><div className="course-code">{course.courseCode}</div><div className="course-name">{course.courseName}<small>{`Year ${course.yearOfStudy} · ${course.stream}`}</small></div><div className="course-actions"><button className="secondary" onClick={() => beginEdit(course)}>Edit</button><button className="danger" onClick={() => removeCourse(course)}>Delete</button></div></article>)}</div></section></section></main>;
}

function App() {
  const [role, setRole] = useState(null);
  const [token, setToken] = useState(null);
  const [roleError, setRoleError] = useState('');
  async function chooseRole(selectedRole) {
    const credentials = selectedRole === 'student' ? { username: 'student', password: 'student123' } : { username: 'admin', password: 'admin123' };
    try {
      const result = await request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
      setToken(result.token);
      setRole(selectedRole);
    } catch (error) { setRoleError(error.message); }
  }
  if (role === 'student') return <StudentView onBack={() => { setRole(null); setToken(null); }} />;
  if (role === 'admin') return <AdminView token={token} onBack={() => { setRole(null); setToken(null); }} />;
  if (role === 'catalogue') return <CourseCatalogueView token={token} onBack={() => { setRole(null); setToken(null); }} />;
  return <main className="role-shell"><div className="brand-mark">A</div><p className="eyebrow">Academic Timetable Loading & Adaptive System</p><h1>Choose a workspace.</h1><p className="role-intro">Select the view you want to test.</p><div className="role-options"><button onClick={() => chooseRole('student')}><span>01</span><strong>Student</strong><small>Confirm courses and view your timetable</small>→</button><button onClick={() => chooseRole('admin')}><span>02</span><strong>Administrator</strong><small>Review and revise the current timetable</small>→</button><button onClick={() => chooseRole('catalogue')}><span>03</span><strong>Course catalogue</strong><small>Enter course codes used by timetable ingestion</small>→</button></div>{roleError && <p className="status">{roleError}</p>}</main>;
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);