import { Router } from 'express';
import {
  Attendance,
  Enrollment,
  Student,
  Subject
} from '../models/index.js';

import { protect, allow } from '../middleware/auth.js';
import { audit } from '../utils/audit.js';

const r = Router();

r.use(protect);

// MARK ATTENDANCE
r.post(
  '/',
  allow('faculty', 'admin'),
  async (req, res, next) => {
    try {
      const { subject, section, date, session, records } = req.body;

      if (
        !subject ||
        !section ||
        !date ||
        !session ||
        !Array.isArray(records) ||
        records.length === 0
      ) {
        return res.status(400).json({
          message: 'Subject, section, date, session and records are required'
        });
      }

      const subjectDoc = await Subject.findById(subject);

      if (!subjectDoc) {
        return res.status(404).json({
          message: 'Subject not found'
        });
      }

      if (req.user.role === 'faculty') {
        const assigned = await Subject.exists({
          _id: subject,
          faculty: req.user._id
        });

        if (!assigned) {
          return res.status(403).json({
            message: 'You are not assigned to this subject'
          });
        }
      }

      const allowedStatuses = [
        'present',
        'absent',
        'late',
        'leave'
      ];

      const studentIds = records.map(x => String(x.student));

      if (new Set(studentIds).size !== studentIds.length) {
        return res.status(400).json({
          message: 'Duplicate student records are not allowed'
        });
      }

      for (const record of records) {
        if (!allowedStatuses.includes(String(record.status).toLowerCase())) {
          return res.status(400).json({
            message: 'Invalid attendance status'
          });
        }
      }

      const enrollments = await Enrollment.find({
        section,
        student: { $in: studentIds },
        active: true
      });

      if (enrollments.length !== studentIds.length) {
        return res.status(400).json({
          message: 'One or more students are not enrolled in this section'
        });
      }

      const docs = enrollments.map(enrollment => {
        const record = records.find(
          x => String(x.student) === String(enrollment.student)
        );

        return {
          student: enrollment.student,
          faculty: req.user._id,
          department: subjectDoc.department,
          course: enrollment.course,
          semester: enrollment.semester,
          section,
          subject,
          date,
          session,
          status: String(record.status).toLowerCase()
        };
      });

      const saved = await Attendance.insertMany(docs, {
        ordered: true
      });

      await audit(
        req,
        'CREATE',
        'Attendance',
        saved[0]._id,
        {
          count: saved.length,
          subject,
          date,
          session
        }
      );

      res.status(201).json({
        count: saved.length,
        records: saved
      });
    } catch (e) {
      next(e);
    }
  }
);

// GET ATTENDANCE
r.get('/', async (req, res, next) => {
  try {
    const filter = {};

    for (const key of [
      'subject',
      'section',
      'date',
      'student',
      'department',
      'course',
      'semester'
    ]) {
      if (req.query[key]) {
        filter[key] = req.query[key];
      }
    }

    if (req.user.role === 'student') {
      const student = await Student.findOne({
        user: req.user._id
      });

      if (!student) return res.json([]);

      filter.student = student._id;
    }

    if (req.user.role === 'faculty') {
      filter.faculty = req.user._id;
    }

    if (req.user.role === 'hod') {
      filter.department = {
        $in: req.user.departments || []
      };
    }

    const rows = await Attendance.find(filter)
      .populate('student', 'rollNumber user')
      .populate('subject', 'name code')
      .populate('faculty', 'name')
      .sort({ date: -1 })
      .limit(
        Math.min(Number(req.query.limit) || 500, 1000)
      );

    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// STUDENT ATTENDANCE SUMMARY
r.get(
  '/my-summary',
  allow('student'),
  async (req, res, next) => {
    try {
      const student = await Student.findOne({
        user: req.user._id
      });

      if (!student) {
        return res.status(404).json({
          message: 'Student profile not found'
        });
      }

      const rows = await Attendance.find({
        student: student._id
      });

      const counts = {
        present: 0,
        absent: 0,
        late: 0,
        leave: 0
      };

      rows.forEach(row => {
        counts[row.status]++;
      });

      const total =
        counts.present + counts.absent + counts.late;

      res.json({
        counts,
        total: rows.length,
        percentage: total
          ? Number(
              (
                ((counts.present + counts.late) / total) *
                100
              ).toFixed(2)
            )
          : 0,
        threshold: Number(
          process.env.ATTENDANCE_THRESHOLD || 75
        )
      });
    } catch (e) {
      next(e);
    }
  }
);

// UPDATE ATTENDANCE
r.patch(
  '/:id',
  allow('admin', 'hod', 'faculty'),
  async (req, res, next) => {
    try {
      const row = await Attendance.findById(req.params.id);

      if (!row) {
        return res.status(404).json({
          message: 'Attendance not found'
        });
      }

      if (
        req.user.role === 'faculty' &&
        String(row.faculty) !== String(req.user._id)
      ) {
        return res.status(403).json({
          message: 'Not your attendance record'
        });
      }

      if (
        req.user.role === 'hod' &&
        !(req.user.departments || [])
          .map(String)
          .includes(String(row.department))
      ) {
        return res.status(403).json({
          message: 'Department access denied'
        });
      }

      const status = String(req.body.status || '').toLowerCase();

      if (
        !req.body.reason ||
        !['present', 'absent', 'late', 'leave'].includes(status)
      ) {
        return res.status(400).json({
          message: 'Valid status and modification reason required'
        });
      }

      const oldStatus = row.status;

      row.status = status;
      row.reason = req.body.reason;

      await row.save();

      await audit(
        req,
        'UPDATE',
        'Attendance',
        row._id,
        {
          oldStatus,
          newStatus: row.status,
          reason: req.body.reason
        }
      );

      res.json(row);
    } catch (e) {
      next(e);
    }
  }
);

export default r;