import { Router } from 'express';
import {
  AttendanceRequest,
  Student,
  Attendance,
  Subject
} from '../models/index.js';
import { protect, allow } from '../middleware/auth.js';
import { audit } from '../utils/audit.js';

const r = Router();

r.use(protect);

// Student creates attendance correction request
r.post('/', allow('student'), async (req, res, next) => {
  try {
    const student = await Student.findOne({ user: req.user._id });

    if (!student) {
      return res.status(404).json({
        message: 'Student profile missing'
      });
    }

    const {
      subject,
      date,
      session,
      reason,
      requestedStatus = 'present'
    } = req.body;

    if (
      !subject ||
      !date ||
      !session ||
      !reason ||
      !['present', 'absent', 'late', 'leave'].includes(requestedStatus)
    ) {
      return res.status(400).json({
        message: 'Subject, date, session, reason and a valid requested status are required'
      });
    }

    const doc = await AttendanceRequest.create({
      subject,
      date,
      session,
      reason,
      requestedStatus,
      student: student._id
    });

    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

// Get requests according to user role
r.get('/', async (req, res, next) => {
  try {
    let filter = {};

    if (req.user.role === 'student') {
      const student = await Student.findOne({
        user: req.user._id
      });

      if (!student) {
        return res.json([]);
      }

      filter.student = student._id;
    } else if (req.user.role === 'faculty') {
      const subjects = await Subject.find({
        faculty: { $in: [req.user._id] }
      }).select('_id');

      filter.subject = {
        $in: subjects.map(x => x._id)
      };
    } else if (req.user.role === 'hod') {
      const departments = req.user.departments || [];

      const subjects = await Subject.find({
        department: { $in: departments }
      }).select('_id');

      filter.subject = {
        $in: subjects.map(x => x._id)
      };
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    const docs = await AttendanceRequest.find(filter)
      .populate('student')
      .populate('subject')
      .sort({ createdAt: -1 });

    res.json(docs);
  } catch (e) {
    next(e);
  }
});

// Faculty, HOD and Admin review requests
r.patch('/:id/review', allow('admin', 'hod', 'faculty'), async (req, res, next) => {
  try {
    const doc = await AttendanceRequest.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({
        message: 'Request not found'
      });
    }

    if (!['approved', 'rejected'].includes(req.body.status)) {
      return res.status(400).json({
        message: 'Invalid decision'
      });
    }

    const subject = await Subject.findById(doc.subject).select(
      'faculty department'
    );

    if (!subject) {
      return res.status(404).json({
        message: 'Subject not found'
      });
    }

    // Faculty can review only assigned subjects
    if (
      req.user.role === 'faculty' &&
      !subject.faculty.some(
        id => String(id) === String(req.user._id)
      )
    ) {
      return res.status(403).json({
        message: 'You are not assigned to this subject'
      });
    }

    // HOD can review only subjects in assigned departments
    if (
      req.user.role === 'hod' &&
      !(req.user.departments || []).some(
        id => String(id) === String(subject.department)
      )
    ) {
      return res.status(403).json({
        message: 'Department access denied'
      });
    }

    doc.status = req.body.status;
    doc.reviewedBy = req.user._id;
    doc.reviewNote = req.body.reviewNote || '';

    await doc.save();

    // Update attendance only when request is approved
    if (doc.status === 'approved') {
      const attendance = doc.attendance
        ? await Attendance.findById(doc.attendance)
        : await Attendance.findOne({
            student: doc.student,
            subject: doc.subject,
            date: doc.date,
            session: doc.session
          });

      if (attendance) {
        attendance.status = doc.requestedStatus;
        attendance.reason = 'Approved correction request';
        await attendance.save();
      }
    }

    await audit(
      req,
      'REVIEW',
      'AttendanceRequest',
      doc._id,
      { status: doc.status }
    );

    res.json(doc);
  } catch (e) {
    next(e);
  }
});

export default r;