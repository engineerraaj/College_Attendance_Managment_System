import React, { useEffect, useState } from 'react';
import {
  Routes,
  Route,
  Navigate,
  Link,
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
  CalendarDays
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


function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@college.test');
  const [password, setPassword] = useState('ChangeMe123!');
  const [err, setErr] = useState('');

  return (
    <div className="login">
      <form
        className="login-card"
        onSubmit={async e => {
          e.preventDefault();
          setErr('');

          try {
            const { data } = await api.post('/auth/login', {
              email,
              password
            });

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            onLogin(data.user);
          } catch (x) {
            setErr(
              x.response?.data?.message || 'Unable to sign in'
            );
          }
        }}
      >
        <div className="brand-mark">CA</div>
        <h1>College Attendance</h1>
        <p className="muted">Sign in to your workspace</p>

        {err && <div className="error">{err}</div>}

        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        <button className="primary full">Sign in</button>

        <small>
          Demo: admin, HOD, faculty and student accounts use
          password ChangeMe123!
        </small>
      </form>
    </div>
  );
}

function Shell({ user, onLogout, children }) {
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  return (
    <div className="shell">
      <aside className={open ? 'sidebar open' : 'sidebar'}>
        <div className="brand">
          <span className="brand-mark">CA</span>
          <span>
            Campus<span className="muted">Flow</span>
          </span>
        </div>

        <div className="role-label">{user.role} workspace</div>

        <nav>
          {(menus[user.role] || []).map(([n, p, I]) => (
            <Link
              className={loc.pathname === p ? 'active' : ''}
              to={p}
              key={p}
            >
              <I size={18} />
              {n}
            </Link>
          ))}
        </nav>

        <button className="logout" onClick={onLogout}>
          <LogOut size={18} /> Sign out
        </button>
      </aside>

      <main className="main">
        <header>
          <button
            className="icon-btn mobile"
            onClick={() => setOpen(!open)}
          >
            <Menu />
          </button>

          <div>
            <b>{user.name}</b>
            <span className="muted"> · {user.role}</span>
          </div>

          <div className="avatar">{user.name?.[0]}</div>
        </header>

        <section className="content">{children}</section>
      </main>
    </div>
  );
}

function Dashboard({ user }) {
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (user.role !== 'student') {
      api.get('/reports/summary')
        .then(r => setData(r.data))
        .catch(() => {});
    } else {
      api.get('/attendance/my-summary')
        .then(r => setSummary(r.data))
        .catch(() => {});
    }
  }, [user.role]);

  const student = user.role === 'student';

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

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">OVERVIEW</p>
          <h1>Good day, {user.name.split(' ')[0]}</h1>
          <p className="muted">
            Here is your college attendance snapshot.
          </p>
        </div>
        <span className="pill">{user.role.toUpperCase()}</span>
      </div>

      <div className="stats">
        {cards.map(([a, b]) => (
          <div className="stat" key={a}>
            <span>{a}</span>
            <strong>{b}</strong>
            <small className="muted">Live from your records</small>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>Attendance overview</h2>
            <p className="muted">
              Current data from the attendance API
            </p>
          </div>
          <RefreshCw size={18} />
        </div>

        <div className="chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={Object.entries(
                student ? summary?.counts || {} : data?.counts || {}
              ).map(([name, value]) => ({ name, value }))}
            >
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
function Reports() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError('');
    api.get('/reports/summary')
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.message || 'Could not load reports'))
      .finally(() => setLoading(false));
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
          <p className="muted">Summary of attendance records.</p>
        </div>
        <button className="secondary" onClick={load}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="panel"><p>Loading reports...</p></div>
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
                <p className="muted">Counts from saved attendance records</p>
              </div>
            </div>
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Present', value: data.counts?.present || 0 },
                  { name: 'Absent', value: data.counts?.absent || 0 },
                  { name: 'Late', value: data.counts?.late || 0 },
                  { name: 'Leave', value: data.counts?.leave || 0 }
                ]}>
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <div className="panel empty">No report data available.</div>
      )}
    </>
  );
}
 function DataPage ({title, endpoint, canAdd = true }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [departmentCode, setDepartmentCode] = useState('');
  const [err, setErr] = useState('');

  const load = () => {
    setLoading(true);

    api.get(endpoint)
      .then(r => setRows(r.data))
      .catch(e => {
        setErr(
          e.response?.data?.message || 'Could not load records'
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
  setRows([]);
  setErr('');
  load();
}, [endpoint]);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">MANAGEMENT</p>
          <h1>{title}</h1>
          <p className="muted">Manage records stored in MongoDB.</p>
        </div>

        <button className="secondary" onClick={load}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {canAdd && (
        <form
          className="inline-form"
          onSubmit={async e => {
            e.preventDefault();

            try {
     await api.post(endpoint, {
  name,
  code,
  ...(['Students', 'Faculty'].includes(title) ? { email, password } : {}),
  ...(title === 'Faculty' ? { departmentCode } : {})
});
              setName('');
              setCode('');
              load();
            } catch (x) {
              setErr(
                x.response?.data?.message || 'Create failed'
              );
            }
          }}
        >
          <input
            placeholder="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />

          <input
            placeholder="Code / identifier"
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
    {title === 'Faculty' && (
  <input
    placeholder="Department Code (e.g. CSE)"
    value={departmentCode}
    onChange={e => setDepartmentCode(e.target.value)}
    required
  />
)}
  </>
)}
          <button className="primary">
            <Plus size={16} /> Add record
          </button>
        </form>
      )}

      {err && <div className="error">{err}</div>}

      <div className="panel table-wrap">
        {loading ? (
          <p>Loading…</p>
        ) : rows.length === 0 ? (
          <div className="empty">
            No records found yet. Add a record or run the seed script.
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
              {rows.map(x => (
                <tr key={x._id}>
                  <td>
  {title === 'Timetable'
    ? `${x.subject?.name || 'Subject'} - ${x.day || ''}`
    : x.user?.name || x.name || x.title || x.rollNumber ||
      x.employeeId || x.email || x.user?.email || x._id}
</td>
                  <td>
                    {title === 'Timetable'
  ? `${x.startTime || ''} - ${x.endTime || ''} | Section ${x.section?.name || ''}`
  : x.code || x.rollNumber || x.employeeId ||
    x.role || '—'}
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

function AttendancePage({ user, mode = 'history' }) {
  const [rows, setRows] = useState([]);
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [subject, setSubject] = useState('');
  const [section, setSection] = useState('');
  const [session, setSession] = useState('Lecture 1');
  const [students, setStudents] = useState([]);
  const [status, setStatus] = useState({});
  const [message, setMessage] = useState('');

  const load = () => {
    api.get('/attendance')
      .then(r => setRows(r.data))
      .catch(e => {
        setMessage(
          e.response?.data?.message || 'Could not load attendance'
        );
      });
  };

  useEffect(() => {
    load();
  }, []);

  const mark = async e => {
    e.preventDefault();

    try {
      console.log("SUBMIT BUTTON CLICKED");

const response = await api.post('/attendance', {
        subject,
        section,
        date,
        session,
        records: students.map(s => ({
          student: s._id,
          status: status[s._id] || 'present'
        }))
      });
console.log("ATTENDANCE RESPONSE:", response.data);
      setMessage('Attendance submitted successfully');
      load();
 } catch (x) {
      console.log("ATTENDANCE ERROR:", x.response?.data || x);
      setMessage(
        x.response?.data?.message || 'Submission failed'
      );
    }
  };

  const fetchStudents = async () => {
    console.log("FETCH STUDENTS BUTTON CLICKED");
    try {
      const { data } = await api.get('/enrollments');
console.log('ENROLLMENT DATA:', data);
      const list = data
        .filter(e => String(e.section?._id || e.section) === String(section))
        .map(e => e.student)
        .filter(Boolean);

      setStudents(list);
    } catch (x) {
      setMessage(
        'Could not load enrollments; check class setup.'
      );
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">ATTENDANCE</p>
          <h1>
            {user.role === 'student'
              ? 'My attendance'
              : 'Attendance records'}
          </h1>
          <p className="muted">
            View attendance or submit a class session.
          </p>
        </div>

        <button className="secondary" onClick={load}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {user.role === 'faculty' && mode === 'mark' && (
        <form className="panel mark-form" onSubmit={mark}>
          <h2>Mark attendance</h2>

          <div className="form-grid">
            <label>
              Subject ID
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="MongoDB subject ID"
                required
              />
            </label>

            <label>
              Section ID
              <input
                value={section}
                onChange={e => setSection(e.target.value)}
                placeholder="MongoDB section ID"
                required
              />
            </label>

            <label>
              Date
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </label>

            <label>
              Session
              <input
                value={session}
                onChange={e => setSession(e.target.value)}
                required
              />
            </label>
          </div>

          <button
            type="button"
            className="secondary"
            onClick={fetchStudents}
          >
            Load enrolled students
          </button>

          {students.map(s => (
            <div className="student-row" key={s._id}>
              <span>{s.rollNumber}</span>

              <select
                value={status[s._id] || 'present'}
                onChange={e =>
                  setStatus({
                    ...status,
                    [s._id]: e.target.value
                  })
                }
              >
                {['present', 'absent', 'late', 'leave'].map(v => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </div>
          ))}

          <button className="primary" disabled={!students.length}>
            Submit attendance
          </button>
        </form>
      )}

      {message && <p className="muted">{message}</p>}

      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Student</th>
              <th>Subject</th>
              <th>Session</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {rows.map(x => (
              <tr key={x._id}>
                <td>{x.date}</td>
                <td>{x.student?.rollNumber || '—'}</td>
                <td>{x.subject?.name || '—'}</td>
                <td>{x.session}</td>
                <td>
                  <span className="pill">{x.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!rows.length && (
          <div className="empty">
            No attendance records available.
          </div>
        )}
      </div>
    </>
  );
}

function Requests({ user }) {
  const [rows, setRows] = useState([]);
  const [reason, setReason] = useState('');
  const [date, setDate] = useState('');
  const [subject, setSubject] = useState('');
  const [session, setSession] = useState('Lecture 1');
  const [message, setMessage] = useState('');

  const load = () => {
    api.get('/attendance-requests')
      .then(r => setRows(r.data))
      .catch(e => {
        setMessage(
          e.response?.data?.message || 'Could not load requests'
        );
      });
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async e => {
    e.preventDefault();

    try {
      await api.post('/attendance-requests', {
        reason,
        date,
        subject,
        session,
        requestedStatus: 'present'
      });

      setReason('');
      setMessage('Correction request submitted');
      load();
    } catch (e) {
      setMessage(
        e.response?.data?.message || 'Could not submit request'
      );
    }
  };

  const review = async (id, status) => {
    try {
      await api.patch(
        `/attendance-requests/${id}/review`,
        { status }
      );

      setMessage(`Request ${status}`);
      load();
    } catch (e) {
      setMessage(
        e.response?.data?.message || 'Review failed'
      );
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">WORKFLOW</p>
          <h1>Correction requests</h1>
        </div>
      </div>

      {user.role === 'student' && (
        <form className="inline-form" onSubmit={submit}>
          <input
            placeholder="Subject ID"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            required
          />

          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />

          <input
            placeholder="Session (e.g. Lecture 1)"
            value={session}
            onChange={e => setSession(e.target.value)}
            required
          />

          <input
            placeholder="Reason for correction"
            value={reason}
            onChange={e => setReason(e.target.value)}
            required
          />

          <button className="primary">Submit request</button>
        </form>
      )}

      {message && <p className="muted">{message}</p>}

      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Student</th>
              <th>Subject</th>
              <th>Reason</th>
              <th>Status</th>
              {['admin', 'hod', 'faculty'].includes(user.role) && (
                <th>Review</th>
              )}
            </tr>
          </thead>

          <tbody>
            {rows.map(x => (
              <tr key={x._id}>
                <td>{x.date}</td>
                <td>{x.student?.rollNumber || '—'}</td>
                <td>{x.subject?.name || '—'}</td>
                <td>{x.reason}</td>
                <td>{x.status}</td>

                {['admin', 'hod', 'faculty'].includes(user.role) && (
                  <td>
                    {x.status === 'pending' && (
                      <>
                        <button
                          className="secondary"
                          onClick={() => review(x._id, 'approved')}
                        >
                          Approve
                        </button>{' '}

                        <button
                          className="secondary"
                          onClick={() => review(x._id, 'rejected')}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {!rows.length && (
          <div className="empty">
            No correction requests available.
          </div>
        )}
      </div>
    </>
  ); 
}
function App() {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const navigate = useNavigate();

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

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user
            ? <Navigate to="/dashboard" replace />
            : <Login onLogin={handleLogin} />
        }
      />

      <Route
        path="/*"
        element={
          user ? (
            <Shell user={user} onLogout={handleLogout}>
              <Routes>
                <Route path="/dashboard" element={<Dashboard user={user} />} />

                <Route path="/attendance" element={<AttendancePage user={user} />} />

                <Route path="/mark-attendance" element={<AttendancePage user={user} mode="mark" />} />

                <Route path="/requests" element={<Requests user={user} />} />

                <Route path="/students" element={<DataPage title="Students" endpoint="/students" />} />

                <Route path="/faculty" element={<DataPage title="Faculty" endpoint="/faculty" />} />

                <Route path="/departments" element={<DataPage title="Departments" endpoint="/departments" />} />

                <Route path="/subjects" element={<DataPage title="Subjects" endpoint="/subjects" />} />

                <Route
  path="/timetable"
  element={
    user.role === 'admin'
      ? <DataPage title="Timetable" endpoint="/timetable" />
      : <DataPage title="Timetable" endpoint="/timetable" canAdd={false} />
  }
/>

                <Route path="/users" element={<DataPage title="Users" endpoint="/users" />} />

                <Route path="/audit-logs" element={<DataPage title="Audit Logs" endpoint="/audit-logs" canAdd={false} />} />

               <Route path="/reports" element={<Reports />} />
                <Route path="/notices" element={<DataPage title="Notices" endpoint="/notices" />} />

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Shell>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

export default App;