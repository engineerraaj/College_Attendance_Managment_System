import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  User, Department, Course, Semester, Subject, Section, AcademicSession,
  Student, Faculty, Enrollment
} from './models/index.js';

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is missing. Create backend/.env from backend/.env.example.');
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGODB_URI);
  const password = await bcrypt.hash('ChangeMe123!', 12);

  // Idempotent seed: update only these demo records; never wipe existing college data.
  const upsert = (Model, filter, values) =>
    Model.findOneAndUpdate(filter, { $set: values }, {
      new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true
    });

  const admin = await upsert(User, { email: 'admin@college.test' }, {
    name: 'System Admin', email: 'admin@college.test', password, role: 'admin', active: true
  });
  const hod = await upsert(User, { email: 'hod@college.test' }, {
    name: 'Department HOD', email: 'hod@college.test', password, role: 'hod', active: true
  });
  const facultyUser = await upsert(User, { email: 'faculty@college.test' }, {
    name: 'Demo Faculty', email: 'faculty@college.test', password, role: 'faculty', active: true
  });
  const studentUser = await upsert(User, { email: 'student@college.test' }, {
    name: 'Demo Student', email: 'student@college.test', password, role: 'student', active: true
  });

  const dept = await upsert(Department, { code: 'CSE' }, {
    name: 'Computer Science', code: 'CSE', hod: hod._id, active: true
  });
  hod.departments = [dept._id];
  await hod.save();

  const course = await upsert(Course, { code: 'BTCS' }, {
    name: 'B.Tech Computer Science', code: 'BTCS', department: dept._id, durationYears: 4
  });
  const session = await upsert(AcademicSession, { name: '2026-27' }, {
    name: '2026-27', current: true
  });
  const semester = await upsert(Semester, { course: course._id, number: 1 }, {
    name: 'Semester 1', number: 1, course: course._id, academicSession: session._id
  });
  const section = await upsert(Section, { name: 'A', course: course._id, semester: semester._id }, {
    name: 'A', course: course._id, semester: semester._id, department: dept._id
  });
  await upsert(Subject, { code: 'CS101' }, {
    name: 'Programming Fundamentals', code: 'CS101', course: course._id,
    semester: semester._id, department: dept._id, faculty: [facultyUser._id], active: true
  });
  const student = await upsert(Student, { rollNumber: 'CSE2026001' }, {
    user: studentUser._id, rollNumber: 'CSE2026001'
  });
  await upsert(Faculty, { employeeId: 'EMP001' }, {
    user: facultyUser._id, employeeId: 'EMP001', department: dept._id
  });
  await upsert(Enrollment, { student: student._id, academicSession: session._id }, {
    student: student._id, course: course._id, semester: semester._id,
    section: section._id, academicSession: session._id, active: true
  });

  console.log('Seed complete. Demo password: ChangeMe123!');
  console.log('Demo users: admin@college.test, hod@college.test, faculty@college.test, student@college.test');
} catch (error) {
  console.error('Seed failed:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
