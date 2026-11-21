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
  AuditLog
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

const adminOnly = [
  'users',
  'students',
  'faculty',
  'departments',
  'courses',
  'semesters',
  'subjects',
  'sections',
  'enrollments',
  'timetable'
];

for (const [name, Model] of Object.entries(resources)) {
  const sub = Router();

  // GET RECORDS
  sub.get('/', async (req, res, next) => {
    try {
      let f = {};

      if (
        req.user.role === 'hod' &&
        ['departments', 'courses', 'subjects', 'sections', 'faculty'].includes(name)
      ) {
        f.department = { $in: req.hodDepartments };
      }

      if (req.user.role === 'student' && name === 'timetable') {
  const student = await Student.findOne({ user: req.user._id });

  if (!student) {
    return res.json([]);
  }

  const enrollments = await Enrollment.find({
    student: student._id
  }).select('section');

  f.section = {
    $in: enrollments.map(e => e.section)
  };
}

if (
  req.user.role === 'student' &&
  name !== 'notices' &&
  name !== 'notifications' &&
  name !== 'timetable'
) {
  return res.status(403).json({
    message: 'Use student-specific endpoints'
  });

        return res.status(403).json({
          message: 'Use student-specific endpoints'
        });
      }

      if (name === 'notifications') {
        f.user = req.user._id;
      }

      let query = Model.find(f);

      if (name === 'enrollments') {
        query = query
          .populate('student', 'rollNumber')
          .populate('section', 'name')
          .populate('course', 'name')
          .populate('semester', 'name');
      }

      if (name === 'faculty') {
        query = query
          .populate('user', 'name email')
          .populate('department', 'name code');
      }

      if (name === 'students') {
        query = query.populate('user', 'name email');
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
        .select(name === 'users' ? '-password' : undefined)
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
        const account = await User.create({
          name: req.body.name,
          email: req.body.email,
          password: await bcrypt.hash(req.body.password, 10),
          role: 'student'
        });

        try {
          doc = await Student.create({
            user: account._id,
            rollNumber: req.body.code
          });
        } catch (e) {
          await User.findByIdAndDelete(account._id);
          throw e;
        }

      } else if (name === 'faculty') {
        const department = await Department.findOne({
          code: req.body.departmentCode
        });

        if (!department) {
          return res.status(400).json({
            message: 'Department code not found'
          });
        }

        const account = await User.create({
          name: req.body.name,
          email: req.body.email,
          password: await bcrypt.hash(req.body.password, 10),
          role: 'faculty'
        });

        try {
          doc = await Faculty.create({
            user: account._id,
            employeeId: req.body.code,
            department: department._id
          });
        } catch (e) {
          await User.findByIdAndDelete(account._id);
          throw e;
        }

      } else {
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
r.get('/reports/summary', allow('admin', 'hod', 'faculty'), async (req, res, next) => {
  try {
    const {
      Attendance,
      Student: StudentModel,
      Faculty: FacultyModel
    } = await import('../models/index.js');

    const f =
      req.user.role === 'hod'
        ? { department: { $in: req.hodDepartments } }
        : {};

    const [students, faculty, attendance] = await Promise.all([
      StudentModel.countDocuments(),
      FacultyModel.countDocuments(),
      Attendance.find(f)
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

    const d = counts.present + counts.absent + counts.late;

    res.json({
      students,
      faculty,
      totalAttendance: attendance.length,
      counts,
      percentage: d
        ? Number(
            (((counts.present + counts.late) / d) * 100).toFixed(1)
          )
        : 0
    });
  } catch (e) {
    next(e);
  }
});

// AUDIT LOGS
r.get('/audit-logs', allow('admin', 'hod'), async (req, res, next) => {
  try {
    const f = req.user.role === 'hod' ? {} : {};

    const logs = await AuditLog.find(f)
      .populate('actor', 'name email')
      .sort({ createdAt: -1 })
      .limit(300);

    res.json(logs);
  } catch (e) {
    next(e);
  }
});

export default r;