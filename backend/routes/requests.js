import {Router} from 'express';
import {AttendanceRequest,Student,Attendance,Subject} from '../models/index.js';
import {protect,allow} from '../middleware/auth.js';
import {audit} from '../utils/audit.js';
const r=Router();r.use(protect);
r.post('/',allow('student'),async(req,res,next)=>{try{const s=await Student.findOne({user:req.user._id});if(!s)return res.status(404).json({message:'Student profile missing'});
const {subject,date,session,reason,requestedStatus='present'}=req.body;
if(!subject||!date||!session||!reason||!['present','absent','late','leave'].includes(requestedStatus))
 return res.status(400).json({message:'Subject, date, session, reason and a valid requested status are required'});
const doc=await AttendanceRequest.create({subject,date,session,reason,requestedStatus,student:s._id});res.status(201).json(doc);}catch(e){next(e);}});
r.get('/',async(req,res,next)=>{try{
 let f={};
 if(req.user.role==='student'){
  const student=await Student.findOne({user:req.user._id});
  if(!student)return res.json([]);
  f.student=student._id;
 } else if(req.user.role==='faculty'){
  const subjects=await Subject.find({faculty:req.user._id}).select('_id');
  f.subject={$in:subjects.map(x=>x._id)};
 } else if(req.user.role==='hod'){
  const subjects=await Subject.find({department:{$in:req.user.departments}}).select('_id');
  f.subject={$in:subjects.map(x=>x._id)};
 }
 const docs=await AttendanceRequest.find(f).populate('student').populate('subject').sort({createdAt:-1});
 res.json(docs);
}catch(e){next(e);}});
r.patch('/:id/review',allow('admin','hod','faculty'),async(req,res,next)=>{try{const doc=await AttendanceRequest.findById(req.params.id);if(!doc)return res.status(404).json({message:'Request not found'});
if(!['approved','rejected'].includes(req.body.status))return res.status(400).json({message:'Invalid decision'});
if(req.user.role==='faculty' && !(await Subject.exists({_id:doc.subject,faculty:req.user._id})))
 return res.status(403).json({message:'You are not assigned to this subject'});
if(req.user.role==='hod' && !req.user.departments.map(String).includes(String((await Subject.findById(doc.subject).select('department'))?.department)))
 return res.status(403).json({message:'Department access denied'});
doc.status=req.body.status;doc.reviewedBy=req.user._id;doc.reviewNote=req.body.reviewNote||'';await doc.save();
if(doc.status==='approved'){
 const attendance=doc.attendance
  ? await Attendance.findById(doc.attendance)
  : await Attendance.findOne({student:doc.student,subject:doc.subject,date:doc.date,session:doc.session});
 if(attendance){attendance.status=doc.requestedStatus;attendance.reason='Approved correction request';await attendance.save();}
}
await audit(req,'REVIEW','AttendanceRequest',doc._id,{status:doc.status});res.json(doc);}catch(e){next(e);}});
export default r;
