import { Router } from 'express';
import {
  User,
  Student,
  Faculty,
  Department,
  Course,
  Semester,
  Subject,
  Section,
  Enrollment,
  Timetable,
  Notice,
  Notification,
  AuditLog,
  Attendance
} from '../models/index.js';

import { protect, allow, departmentScope } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import { audit } from '../utils/audit.js';

const r = Router();

r.use(protect, departmentScope);

const resources = {
  users: User,
  students: Student,
  faculty: Faculty,
  departments: Department,
  courses: Course,
  semesters: Semester,
  subjects: Subject,
  sections: Section,
  enrollments: Enrollment,
  timetable: Timetable,
  notices: Notice,
  notifications: Notification
};

// GET RECORDS
for (const [name, Model] of Object.entries(resources)) {
  const sub = Router();

  sub.get('/', async (req, res, next) => {
    try {
      let filter = {};

      if (
        req.user.role === 'hod' &&
        ['departments', 'courses', 'subjects', 'sections', 'faculty'].includes(name)
      ) {
        filter.department = { $in: req.hodDepartments || [] };
      }

      if (
        req.user.role === 'student' &&
        name === 'timetable'
      ) {
        const student = await Student.findOne({
          user: req.user._id
        });

        if (!student) return res.json([]);

        const enrollments = await Enrollment.find({
          student: student._id,
          active: true
        }).select('section');

        filter.section = {
          $in: enrollments.map(e => e.section)
        };
      }

      if (
        req.user.role === 'student' &&
        !['notices', 'notifications', 'timetable'].includes(name)
      ) {
        return res.status(403).json({
          message: 'Use student-specific endpoints'
        });
      }

      if (name === 'notifications') {
        filter.user = req.user._id;
      }

      let query = Model.find(filter);

      if (name === 'users') {
        query = query.select('-password');
      }

      if (name === 'students') {
        query = query.populate('user', 'name email');
      }

      if (name === 'faculty') {
        query = query
          .populate('user', 'name email')
          .populate('department', 'name code');
      }

      if (name === 'enrollments') {
        query = query
          .populate('student', 'rollNumber user')
          .populate('section', 'name')
          .populate('course', 'name')
          .populate('semester', 'name');
      }

      if (name === 'subjects') {
        query = query
          .populate('department', 'name code')
          .populate('faculty', 'name email')
          .populate('course', 'name')
          .populate('semester', 'name');
      }

      if (name === 'departments') {
        query = query.populate('hod', 'name email');
      }

      if (name === 'timetable') {
        query = query
          .populate('subject', 'name code')
          .populate('faculty', 'name')
          .populate('section', 'name')
          .populate('department', 'name')
          .populate('course', 'name')
          .populate('semester', 'name');
      }

      const docs = await query
        .limit(Math.min(Number(req.query.limit) || 200, 500))
        .sort({ createdAt: -1 });

      res.json(docs);
    } catch (e) {
      next(e);
    }
  });

  // ADD RECORD
  sub.post('/', allow('admin'), async (req, res, next) => {
    try {
      let doc;

      if (name === 'students') {
        const rollNumber = req.body.rollNumber || req.body.code;

        if (
          !req.body.name ||
          !req.body.email ||
          !req.body.password ||
          !rollNumber
        ) {
          return res.status(400).json({
            message: 'Name, email, password and roll number are required'
          });
        }

        const account = await User.create({
          name: req.body.name.trim(),
          email: req.body.email.trim(),
          password: await bcrypt.hash(req.body.password, 10),
          role: 'student'
        });

        try {
          doc = await Student.create({
            user: account._id,
            rollNumber: String(rollNumber).trim()
          });
        } catch (e) {
          await User.findByIdAndDelete(account._id);
          throw e;
        }

        await doc.populate('user', 'name email');
      }

      else if (name === 'faculty') {
        const employeeId = req.body.employeeId || req.body.code;

        if (
          !req.body.name ||
          !req.body.email ||
          !req.body.password ||
          !employeeId ||
          !req.body.departmentCode
        ) {
          return res.status(400).json({
            message: 'Name, email, password, employee ID and department code are required'
          });
        }

        const department = await Department.findOne({
          code: req.body.departmentCode.trim()
        });

        if (!department) {
          return res.status(400).json({
            message: 'Department code not found'
          });
        }

        const account = await User.create({
          name: req.body.name.trim(),
          email: req.body.email.trim(),
          password: await bcrypt.hash(req.body.password, 10),
          role: 'faculty'
        });

        try {
          doc = await Faculty.create({
            user: account._id,
            employeeId: String(employeeId).trim(),
            department: department._id
          });
        } catch (e) {
          await User.findByIdAndDelete(account._id);
          throw e;
        }

        await doc.populate([
          { path: 'user', select: 'name email' },
          { path: 'department', select: 'name code' }
        ]);
      }

      else {
        const payload =
          name === 'notices'
            ? {
                title: req.body.name,
                body: req.body.code,
                createdBy: req.user._id
              }
            : req.body;

        doc = await Model.create(payload);
      }

      await audit(req, 'CREATE', name, doc._id);

      res.status(201).json(doc);
    } catch (e) {
      next(e);
    }
  });

  // UPDATE RECORD
  sub.patch('/:id', allow('admin'), async (req, res, next) => {
    try {
      const doc = await Model.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true
        }
      );

      if (!doc) {
        return res.status(404).json({
          message: 'Record not found'
        });
      }

      await audit(req, 'UPDATE', name, doc._id);

      res.json(doc);
    } catch (e) {
      next(e);
    }
  });

  // DEACTIVATE RECORD
  sub.delete('/:id', allow('admin'), async (req, res, next) => {
    try {
      const doc = await Model.findByIdAndUpdate(
        req.params.id,
        { active: false },
        { new: true }
      );

      if (!doc) {
        return res.status(404).json({
          message: 'Record not found'
        });
      }

      await audit(req, 'SOFT_DELETE', name, doc._id);

      res.json({
        message: 'Record deactivated',
        doc
      });
    } catch (e) {
      next(e);
    }
  });

  r.use('/' + name, sub);
}

// REPORTS SUMMARY
r.get(
  '/reports/summary',
  allow('admin', 'hod', 'faculty'),
  async (req, res, next) => {
    try {
      const filter =
        req.user.role === 'hod'
          ? { department: { $in: req.hodDepartments || [] } }
          : {};

      const [students, faculty, attendance] = await Promise.all([
        Student.countDocuments(),
        Faculty.countDocuments(),
        Attendance.find(filter)
      ]);

      const counts = {
        present: 0,
        absent: 0,
        late: 0,
        leave: 0
      };

      attendance.forEach(a => {
        if (counts[a.status] !== undefined) {
          counts[a.status]++;
        }
      });

      const total =
        counts.present + counts.absent + counts.late;

      res.json({
        students,
        faculty,
        totalAttendance: attendance.length,
        counts,
        percentage: total
          ? Number(
              (((counts.present + counts.late) / total) * 100).toFixed(1)
            )
          : 0
      });
    } catch (e) {
      next(e);
    }
  }
);

// AUDIT LOGS
r.get(
  '/audit-logs',
  allow('admin', 'hod'),
  async (req, res, next) => {
    try {
      const logs = await AuditLog.find({})
        .populate('actor', 'name email')
        .sort({ createdAt: -1 })
        .limit(300);

      res.json(logs);
    } catch (e) {
      next(e);
    }
  }
);

export default r;