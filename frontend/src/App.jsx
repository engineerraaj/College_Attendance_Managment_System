import React, { useEffect, useState, useCallback } from 'react';
import {
  Routes,
  Route,
  Navigate,
  Link,
  Outlet,
  useNavigate,
  useLocation
} from 'react-router-dom';

import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  BarChart3,
  ClipboardList,
  LogOut,
  Bell,
  ShieldCheck,
  Menu,
  Plus,
  RefreshCw,
  CalendarDays,
  X
} from 'lucide-react';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

import api from './api';

// =====================================
// ROLE MENUS
// =====================================

const menus = {
  admin: [
    ['Dashboard', '/dashboard', LayoutDashboard],
    ['Students', '/students', Users],
    ['Faculty', '/faculty', GraduationCap],
    ['Departments', '/departments', BookOpen],
    ['Subjects', '/subjects', BookOpen],
    ['Timetable', '/timetable', CalendarCheck],
    ['Notices', '/notices', Bell],
    ['Attendance', '/attendance', ClipboardList],
    ['Reports', '/reports', BarChart3],
    ['Users', '/users', ShieldCheck],
    ['Audit Logs', '/audit-logs', ClipboardList]
  ],

  faculty: [
    ['Dashboard', '/dashboard', LayoutDashboard],
    ['My Subjects', '/subjects', BookOpen],
    ['Timetable', '/timetable', CalendarDays],
    ['Mark Attendance', '/mark-attendance', CalendarCheck],
    ['Attendance History', '/attendance', ClipboardList],
    ['Reports', '/reports', BarChart3],
    ['Correction Requests', '/requests', ClipboardList],
    ['Notices', '/notices', Bell]
  ],

  student: [
    ['Dashboard', '/dashboard', LayoutDashboard],
    ['My Attendance', '/attendance', CalendarCheck],
    ['My Timetable', '/timetable', BookOpen],
    ['Correction Requests', '/requests', ClipboardList],
    ['Notices', '/notices', Bell]
  ],

  hod: [
    ['Dashboard', '/dashboard', LayoutDashboard],
    ['Department Overview', '/departments', BookOpen],
    ['Faculty Monitoring', '/faculty', GraduationCap],
    ['Attendance Overview', '/attendance', CalendarCheck],
    ['Reports', '/reports', BarChart3],
    ['Approval Requests', '/requests', ClipboardList],
    ['Audit Logs', '/audit-logs', ClipboardList],
    ['Notices', '/notices', Bell]
  ]
};

const normalizeRole = role =>
  String(role || '').toLowerCase().trim();

const getRows = data => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const getError = (error, fallback) =>
  error.response?.data?.message ||
  error.response?.data?.error ||
  fallback;

const getLocalDate = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset)
    .toISOString()
    .slice(0, 10);
};

// =====================================
// LOGIN
// =====================================

function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@college.test');
  const [password, setPassword] = useState('ChangeMe123!');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async e => {
    e.preventDefault();

    setErr('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', {
        email: email.trim(),
        password
      });

      if (!data?.token || !data?.user) {
        throw new Error('Invalid login response from server');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      onLogin(data.user);
    } catch (error) {
      setErr(
        error.response?.data?.message ||
        error.message ||
        'Unable to sign in'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <form className="login-card" onSubmit={handleLogin}>
        <div className="brand-mark">CA</div>

        <h1>College Attendance</h1>
        <p className="muted">Sign in to your workspace</p>

        {err && <div className="error">{err}</div>}

        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Enter email"
          required
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Enter password"
          required
        />

        <button
          type="submit"
          className="primary full"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <small>
          Demo accounts use password ChangeMe123!
        </small>
      </form>
    </div>
  );
}

// =====================================
// PROTECTED ROUTES
// =====================================

function RequireAuth({ user }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function RoleRoute({ user, allowed }) {
  if (!allowed.includes(normalizeRole(user?.role))) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

// =====================================
// MAIN LAYOUT
// =====================================

function Shell({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  const role = normalizeRole(user.role);
  const menu = menus[role] || [];

  useEffect(() => {
    setOpen(false);
  }, [loc.pathname]);

  return (
    <div className="shell">

      {open && (
        <button
          className="mobile-overlay"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}

      <aside className={open ? 'sidebar open' : 'sidebar'}>

        <div className="brand">
          <span className="brand-mark">CA</span>
          <span>
            Campus<span className="muted">Flow</span>
          </span>

          <button
            className="icon-btn mobile"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="role-label">
          {role.toUpperCase()} WORKSPACE
        </div>

        <nav>
          {menu.map(([name, path, Icon]) => (
            <Link
              className={
                loc.pathname === path ? 'active' : ''
              }
              to={path}
              key={path}
            >
              <Icon size={18} />
              {name}
            </Link>
          ))}
        </nav>

        <button className="logout" onClick={onLogout}>
          <LogOut size={18} />
          Sign out
        </button>

      </aside>

      <main className="main">

        <header>
          <button
            className="icon-btn mobile"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            <Menu />
          </button>

          <div>
            <b>{user.name || user.email || 'User'}</b>
            <span className="muted">
              {' · '}{role}
            </span>
          </div>

          <div className="avatar">
            {(user.name || user.email || 'U')[0].toUpperCase()}
          </div>
        </header>

        <section className="content">
          <Outlet />
        </section>

      </main>
    </div>
  );
}

// =====================================
// DASHBOARD
// =====================================

function Dashboard({ user }) {
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const role = normalizeRole(user.role);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      if (role === 'student') {
        const r = await api.get('/attendance/my-summary');
        setSummary(r.data);
      } else {
        const r = await api.get('/reports/summary');
        setData(r.data);
      }
    } catch (e) {
      setError(getError(e, 'Could not load dashboard data'));
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    load();
  }, [load]);

  const student = role === 'student';

  const cards = student
    ? [
        ['Attendance', `${summary?.percentage ?? '—'}%`],
        ['Present', summary?.counts?.present ?? 0],
        ['Absent', summary?.counts?.absent ?? 0],
        ['Late', summary?.counts?.late ?? 0]
      ]
    : [
        ['Students', data?.students ?? '—'],
        ['Faculty', data?.faculty ?? '—'],
        ['Attendance records', data?.totalAttendance ?? '—'],
        ['Overall attendance', `${data?.percentage ?? '—'}%`]
      ];

  const counts = student
    ? summary?.counts || {}
    : data?.counts || {};

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">OVERVIEW</p>
          <h1>
            Good day, {(user.name || 'User').split(' ')[0]}
          </h1>
          <p className="muted">
            Here is your college attendance snapshot.
          </p>
        </div>

        <span className="pill">{role.toUpperCase()}</span>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="stats">
        {cards.map(([label, value]) => (
          <div className="stat" key={label}>
            <span>{label}</span>
            <strong>{loading ? '...' : value}</strong>
            <small className="muted">Live from your records</small>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>Attendance overview</h2>
            <p className="muted">
              Current data from attendance API
            </p>
          </div>

          <button
            className="icon-btn"
            onClick={load}
            aria-label="Refresh dashboard"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        <div className="chart">
          {!loading && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={Object.entries(counts).map(
                  ([name, value]) => ({ name, value })
                )}
              >
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey="value"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="notice">
        <ShieldCheck />
        <div>
          <b>Access is role restricted</b>
          <p>
            Only records permitted for your account are returned by the API.
          </p>
        </div>
      </div>
    </>
  );
}

// =====================================
// REPORTS
// =====================================

function Reports() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const r = await api.get('/reports/summary');
      setData(r.data);
    } catch (e) {
      setError(getError(e, 'Could not load reports'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const cards = [
    ['Total Students', data?.students ?? '—'],
    ['Total Faculty', data?.faculty ?? '—'],
    ['Total Attendance', data?.totalAttendance ?? '—'],
    ['Overall Attendance', `${data?.percentage ?? '—'}%`],
    ['Present', data?.counts?.present ?? 0],
    ['Absent', data?.counts?.absent ?? 0],
    ['Late', data?.counts?.late ?? 0],
    ['Leave', data?.counts?.leave ?? 0]
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">REPORTS</p>
          <h1>Attendance Reports</h1>
          <p className="muted">
            Summary of attendance records.
          </p>
        </div>

        <button className="secondary" onClick={load}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="panel">
          <p>Loading reports...</p>
        </div>
      ) : data ? (
        <>
          <div className="stats">
            {cards.map(([label, value]) => (
              <div className="stat" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
                <small className="muted">Live from your records</small>
              </div>
            ))}
          </div>

          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>Attendance status overview</h2>
                <p className="muted">
                  Counts from saved attendance records
                </p>
              </div>
            </div>

            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Present', value: data.counts?.present || 0 },
                    { name: 'Absent', value: data.counts?.absent || 0 },
                    { name: 'Late', value: data.counts?.late || 0 },
                    { name: 'Leave', value: data.counts?.leave || 0 }
                  ]}
                >
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="value"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <div className="panel empty">
          No report data available.
        </div>
      )}
    </>
  );
}

// =====================================
// GENERIC DATA MANAGEMENT
// =====================================

function DataPage({ title, endpoint, canAdd = true }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [departmentCode, setDepartmentCode] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');

    try {
      const r = await api.get(endpoint);
      setRows(getRows(r.data));
    } catch (e) {
      setErr(getError(e, 'Could not load records'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  const createRecord = async e => {
    e.preventDefault();

    setSaving(true);
    setErr('');

    let payload = {
      name: name.trim(),
      code: code.trim()
    };

    if (title === 'Students') {
      payload = {
        name: name.trim(),
        rollNumber: code.trim(),
        email: email.trim(),
        password
      };
    }

    if (title === 'Faculty') {
      payload = {
        name: name.trim(),
        employeeId: code.trim(),
        email: email.trim(),
        password,
        departmentCode: departmentCode.trim()
      };
    }

    try {
      await api.post(endpoint, payload);

      setName('');
      setCode('');
      setEmail('');
      setPassword('');
      setDepartmentCode('');

      await load();
    } catch (e) {
      setErr(getError(e, 'Create failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">MANAGEMENT</p>
          <h1>{title}</h1>
          <p className="muted">
            Manage records stored in MongoDB.
          </p>
        </div>

        <button className="secondary" onClick={load}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {canAdd && (
        <form className="inline-form" onSubmit={createRecord}>
          <input
            placeholder="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />

          <input
            placeholder={
              title === 'Students'
                ? 'Roll Number'
                : title === 'Faculty'
                  ? 'Employee ID'
                  : 'Code / Identifier'
            }
            value={code}
            onChange={e => setCode(e.target.value)}
            required
          />

          {(title === 'Students' || title === 'Faculty') && (
            <>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </>
          )}

          {title === 'Faculty' && (
            <input
              placeholder="Department Code (e.g. CSE)"
              value={departmentCode}
              onChange={e => setDepartmentCode(e.target.value)}
              required
            />
          )}

          <button
            className="primary"
            type="submit"
            disabled={saving}
          >
            <Plus size={16} />
            {saving ? 'Saving...' : 'Add record'}
          </button>
        </form>
      )}

      {err && <div className="error">{err}</div>}

      <div className="panel table-wrap">
        {loading ? (
          <p>Loading...</p>
        ) : rows.length === 0 ? (
          <div className="empty">
            No records found yet.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name / Title</th>
                <th>Code / ID</th>
                <th>Created</th>
                <th>Status</th>
              </tr>
            </thead>

           <tbody>
  {rows.map((x, i) => (
    <tr key={x._id || i}>
      <td>
        {title === 'Timetable'
          ? `${x.subject?.name || 'Subject'} - ${x.day || ''}`
          : title === 'Students' || title === 'Faculty'
            ? x.user?.name || '—'
            : x.name || x.title || x.user?.name || x.email || x._id}
      </td>

      <td>
        {title === 'Timetable'
          ? `${x.startTime || ''} - ${x.endTime || ''} | Section ${x.section?.name || ''}`
          : title === 'Students'
            ? x.rollNumber || '—'
            : title === 'Faculty'
              ? x.employeeId || '—'
              : x.code || x.role || '—'}
      </td>

      <td>
        {x.createdAt
          ? new Date(x.createdAt).toLocaleDateString()
          : '—'}
      </td>

      <td>
        <span className="pill">
          {x.active === false ? 'Inactive' : 'Active'}
        </span>
      </td>
    </tr>
  ))}
</tbody>
          </table>
        )}
      </div>
    </>
  );
}

// =====================================
// ATTENDANCE
// =====================================
function AttendancePage({ user, mode = 'faculty' }) {
  const [enrollments, setEnrollments] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [subject, setSubject] = useState('');
  const [section, setSection] = useState('');
  const [date, setDate] = useState(getLocalDate());
  const [session, setSession] = useState('Morning');
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const getId = value =>
    String(value?._id || value || '');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError('');

        const [enrollmentResponse, subjectResponse] =
          await Promise.all([
            api.get('/enrollments'),
            api.get('/subjects')
          ]);

        setEnrollments(getRows(enrollmentResponse.data));
        setAllSubjects(getRows(subjectResponse.data));
      } catch (err) {
        setError(getError(err, 'Could not load attendance data.'));
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const subjects = allSubjects.filter(item => {
    const assignedFaculty = Array.isArray(item.faculty)
      ? item.faculty.map(getId)
      : [];

    return (
      user?.role !== 'faculty' ||
      assignedFaculty.includes(getId(user._id))
    );
  });

  const selectedSubject = subjects.find(
    item => getId(item._id) === subject
  );

  const filteredEnrollments = enrollments.filter(item => {
    if (!selectedSubject) return false;

    const sameCourse =
      getId(item.course) === getId(selectedSubject.course);

    const sameSemester =
      getId(item.semester) === getId(selectedSubject.semester);

    return sameCourse && sameSemester && item.active !== false;
  });

  const sections = [
    ...new Map(
      filteredEnrollments
        .filter(item => item.section?._id)
        .map(item => [
          getId(item.section),
          item.section
        ])
    ).values()
  ];

  const uniqueStudents = [
    ...new Map(
      filteredEnrollments
        .filter(item =>
          getId(item.section) === section && item.student?._id
        )
        .map(item => [
          getId(item.student),
          item.student
        ])
    ).values()
  ];

  function updateStatus(studentId, status) {
    setRecords(previous => ({
      ...previous,
      [studentId]: status
    }));
  }

  async function submitAttendance() {
    try {
      setSaving(true);
      setError('');
      setMessage('');

      if (!subject || !section) {
        setError('Please select subject and section.');
        return;
      }

      if (!uniqueStudents.length) {
        setError('No students found for this section.');
        return;
      }

      const attendanceRecords = uniqueStudents.map(student => ({
        student: student._id,
        status: records[student._id] || 'present'
      }));

      await api.post('/attendance', {
        subject,
        section,
        date,
        session,
        records: attendanceRecords
      });

      setMessage('Attendance saved successfully!');
      setRecords({});
    } catch (err) {
      setError(getError(err, 'Unable to save attendance.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="page-content">Loading attendance...</div>;
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2>Attendance Management</h2>
          <p>Mark and manage student attendance.</p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      <div className="card">
        <div className="form-group">
          <label>Subject</label>
          <select
            value={subject}
            onChange={e => {
              setSubject(e.target.value);
              setSection('');
              setRecords({});
            }}
          >
            <option value="">Select Subject</option>
            {subjects.map(item => (
              <option key={item._id} value={item._id}>
                {item.name} ({item.code})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Section</label>
          <select
            value={section}
            onChange={e => {
              setSection(e.target.value);
              setRecords({});
            }}
            disabled={!subject}
          >
            <option value="">Select Section</option>
            {sections.map(item => (
              <option key={item._id} value={item._id}>
                {item.name || item.code || 'Section'}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Session</label>
          <select
            value={session}
            onChange={e => setSession(e.target.value)}
          >
            <option value="Morning">Morning</option>
            <option value="Afternoon">Afternoon</option>
            <option value="Evening">Evening</option>
          </select>
        </div>
      </div>

      {subject && section && (
        <div className="card">
          <h3>Student Attendance</h3>

          {!uniqueStudents.length ? (
            <p>No students found for this selection.</p>
          ) : (
            <>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Roll Number</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {uniqueStudents.map(student => (
                      <tr key={student._id}>
                        <td>
                          {student.user?.name || student.name || 'Student'}
                        </td>
                        <td>{student.rollNumber || '—'}</td>
                        <td>
                          <select
                            value={records[student._id] || 'present'}
                            onChange={e =>
                              updateStatus(student._id, e.target.value)
                            }
                          >
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="late">Late</option>
                            <option value="leave">Leave</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={submitAttendance}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
function App() {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    navigate('/dashboard', { replace: true });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login', { replace: true });
  };

  const role = normalizeRole(user?.role);

  const allowed = (...roles) => roles.includes(role);

  return (
    <Routes>
      {/* Login */}
      <Route
        path="/login"
        element={
          user
            ? <Navigate to="/dashboard" replace />
            : <Login onLogin={handleLogin} />
        }
      />

      {/* Protected routes */}
      <Route element={<RequireAuth user={user} />}>
        <Route
          element={
            <Shell user={user} onLogout={handleLogout} />
          }
        >
          <Route
            index
            element={<Navigate to="/dashboard" replace />}
          />

          <Route
            path="/dashboard"
            element={<Dashboard user={user} />}
          />

          {/* Students */}
          <Route element={<RoleRoute user={user} allowed={['admin']} />}>
            <Route
              path="/students"
              element={<DataPage title="Students" endpoint="/students" />}
            />
            <Route
              path="/users"
              element={<DataPage title="Users" endpoint="/users" />}
            />
          </Route>

          {/* Faculty */}
          <Route element={<RoleRoute user={user} allowed={['admin', 'hod']} />}>
            <Route
              path="/faculty"
              element={<DataPage title="Faculty" endpoint="/faculty" />}
            />
          </Route>

          {/* Departments */}
          <Route element={<RoleRoute user={user} allowed={['admin', 'hod']} />}>
            <Route
              path="/departments"
              element={<DataPage title="Departments" endpoint="/departments" />}
            />
          </Route>

          {/* Subjects */}
          <Route element={<RoleRoute user={user} allowed={['admin', 'faculty', 'student']} />}>
            <Route
              path="/subjects"
              element={<DataPage title="Subjects" endpoint="/subjects" canAdd={false} />}
            />
          </Route>

          {/* Timetable */}
          <Route element={<RoleRoute user={user} allowed={['admin', 'faculty', 'student']} />}>
            <Route
              path="/timetable"
              element={<DataPage title="Timetable" endpoint="/timetable" canAdd={false} />}
            />
          </Route>

          {/* Attendance history */}
          <Route element={<RoleRoute user={user} allowed={['admin', 'faculty', 'student', 'hod']} />}>
            <Route
              path="/attendance"
              element={<DataPage title="Attendance" endpoint="/attendance" canAdd={false} />}
            />
          </Route>

          {/* Mark attendance */}
          <Route element={<RoleRoute user={user} allowed={['faculty']} />}>
            <Route
              path="/mark-attendance"
              element={<AttendancePage user={user} />}
            />
          </Route>

          {/* Reports */}
          <Route element={<RoleRoute user={user} allowed={['admin', 'faculty', 'hod']} />}>
            <Route
              path="/reports"
              element={<Reports />}
            />
          </Route>

          {/* Notices */}
          <Route element={<RoleRoute user={user} allowed={['admin', 'faculty', 'student', 'hod']} />}>
            <Route
              path="/notices"
              element={<DataPage title="Notices" endpoint="/notices" canAdd={false} />}
            />
          </Route>

          
{/* Correction requests */}
<Route element={<RoleRoute user={user} allowed={['faculty', 'student', 'hod']} />}>
  <Route
    path="/requests"
    element={
      <DataPage
        title="Correction Requests"
        endpoint="/attendance-requests"
        canAdd={false}
      />
    }
  />
</Route>

          {/* Audit logs */}
          <Route element={<RoleRoute user={user} allowed={['admin', 'hod']} />}>
            <Route
              path="/audit-logs"
              element={<DataPage title="Audit Logs" endpoint="/audit-logs" canAdd={false} />}
            />
          </Route>

          {/* Unknown page */}
          <Route
            path="*"
            element={<Navigate to="/dashboard" replace />}
          />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
