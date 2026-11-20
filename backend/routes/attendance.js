import {Router} from 'express';
import {Attendance,Enrollment,Faculty,Student,Subject,Timetable} from '../models/index.js';
import {protect,allow} from '../middleware/auth.js';
import {audit} from '../utils/audit.js';
const r=Router(); r.use(protect);
r.post('/',allow('faculty','admin'),async(req,res,next)=>{
 try{
 const {subject,section,date,session,records}=req.body;
 if(!subject||!section||!date||!session||!Array.isArray(records)||!records.length)return res.status(400).json({message:'Subject, section, date, session and records are required'});
 if(req.user.role==='faculty'){
    console.log("LOGGED IN USER ID:", String(req.user._id));
console.log("SUBJECT ID:", subject);
  const assigned=await Subject.exists({_id:subject,faculty:req.user._id});
  if(!assigned)return res.status(403).json({message:'You are not assigned to this subject'});
 }
 const subjectDoc=await Subject.findById(subject);if(!subjectDoc)return res.status(404).json({message:'Subject not found'});
 const ids=records.map(x=>String(x.student));
 const enrollments=await Enrollment.find({section,student:{$in:ids},active:true}).populate('student');
 if(enrollments.length!==new Set(ids).size)return res.status(400).json({message:'One or more students are not enrolled in this section'});
 const docs=enrollments.map(e=>{const rec=records.find(x=>String(x.student)===String(e.student._id));return {student:e.student._id,faculty:req.user._id,department:subjectDoc.department,course:e.course,semester:e.semester,section,subject,date,session,status:rec.status};});
 const saved=await Attendance.insertMany(docs,{ordered:true});
 await audit(req,'CREATE','Attendance',saved[0]._id,{count:saved.length,subject,date,session});
 res.status(201).json({count:saved.length,records:saved});
 }catch(e){next(e);}
});
r.get('/',async(req,res,next)=>{
 try{
 const filter={}; for(const k of ['subject','section','date','student','department','course','semester'])if(req.query[k])filter[k]=req.query[k];
 if(req.user.role==='student'){
  const s=await Student.findOne({user:req.user._id});if(!s)return res.json([]);
  filter.student=s._id;
 }
 if(req.user.role==='faculty')filter.faculty=req.user._id;
 if(req.user.role==='hod')filter.department={$in:req.user.departments};
 const rows=await Attendance.find(filter).populate('student','rollNumber').populate('subject','name code').populate('faculty','name').sort({date:-1}).limit(Math.min(Number(req.query.limit)||500,1000));
 res.json(rows);
 }catch(e){next(e);}
});
r.get('/my-summary',allow('student'),async(req,res,next)=>{
 try{const s=await Student.findOne({user:req.user._id});if(!s)return res.status(404).json({message:'Student profile not found'});
 const rows=await Attendance.find({student:s._id});const counts={present:0,absent:0,late:0,leave:0};rows.forEach(x=>counts[x.status]++);
 const denominator=counts.present+counts.absent+counts.late;
 res.json({counts,total:rows.length,percentage:denominator?Number(((counts.present+counts.late)/denominator*100).toFixed(2)):0,threshold:Number(process.env.ATTENDANCE_THRESHOLD||75)});
 }catch(e){next(e);}
});
r.patch('/:id',allow('admin','hod','faculty'),async(req,res,next)=>{
 try{const row=await Attendance.findById(req.params.id);if(!row)return res.status(404).json({message:'Attendance not found'});
 if(req.user.role==='faculty'&&String(row.faculty)!==String(req.user._id))return res.status(403).json({message:'Not your attendance record'});
 if(req.user.role==='hod'&&!req.user.departments.map(String).includes(String(row.department)))return res.status(403).json({message:'Department access denied'});
 if(!req.body.reason||!['present','absent','late','leave'].includes(req.body.status))return res.status(400).json({message:'Valid status and modification reason required'});
 const old=row.status;row.status=req.body.status;row.reason=req.body.reason;await row.save();await audit(req,'UPDATE','Attendance',row._id,{oldStatus:old,newStatus:row.status,reason:req.body.reason});res.json(row);
 }catch(e){next(e);}
});
export default r;
