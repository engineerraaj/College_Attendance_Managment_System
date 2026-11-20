import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const opts = { timestamps: true };
const ref = (name, required=true) => ({ type: Schema.Types.ObjectId, ref:name, required });
const userSchema = new Schema({
  name:{type:String,required:true,trim:true}, email:{type:String,required:true,unique:true,lowercase:true},
  password:{type:String,required:true,select:false}, role:{type:String,enum:['admin','faculty','student','hod'],required:true},
  active:{type:Boolean,default:true}, departments:[ref('Department',false)], permissions:[String], lastLogin:Date
}, opts);
userSchema.index({email:1},{unique:true});
export const User=model('User',userSchema);
export const Department=model('Department',new Schema({name:{type:String,required:true},code:{type:String,unique:true,required:true},hod:ref('User',false),active:{type:Boolean,default:true}},opts));
export const Course=model('Course',new Schema({name:{type:String,required:true},code:{type:String,required:true,unique:true},department:ref('Department'),durationYears:Number},opts));
export const Semester=model('Semester',new Schema({name:{type:String,required:true},number:{type:Number,required:true},course:ref('Course'),academicSession:ref('AcademicSession',false)},opts));
export const Subject=model('Subject',new Schema({name:{type:String,required:true},code:{type:String,required:true,unique:true},course:ref('Course'),semester:ref('Semester'),department:ref('Department'),faculty:[ref('User',false)],active:{type:Boolean,default:true}},opts));
export const Section=model('Section',new Schema({name:{type:String,required:true},course:ref('Course'),semester:ref('Semester'),department:ref('Department'),capacity:Number},opts));
export const AcademicSession=model('AcademicSession',new Schema({name:{type:String,required:true,unique:true},startDate:Date,endDate:Date,current:{type:Boolean,default:false}},opts));
export const Student=model('Student',new Schema({user:ref('User'),rollNumber:{type:String,unique:true,required:true},phone:String,gender:String,dateOfBirth:Date},opts));
export const Faculty=model('Faculty',new Schema({user:ref('User'),employeeId:{type:String,unique:true,required:true},phone:String,department:ref('Department')},opts));
const enrollmentSchema = new Schema({  student: ref('Student'),  course: ref('Course'),  semester: ref('Semester'),  section: ref('Section'),  academicSession: ref('AcademicSession'),  active: { type: Boolean, default: true }}, opts);
enrollmentSchema.index(  { student: 1, academicSession: 1 },  { unique: true });
export const Enrollment = model('Enrollment', enrollmentSchema);
export const Timetable=model('Timetable',new Schema({department:ref('Department'),course:ref('Course'),semester:ref('Semester'),section:ref('Section'),subject:ref('Subject'),faculty:ref('User'),day:{type:String,required:true},startTime:String,endTime:String,room:String,sessionLabel:String},opts));
const attendanceSchema = new Schema({  student: ref('Student'),  faculty: ref('User'),  department: ref('Department'),  course: ref('Course'),  semester: ref('Semester'),  section: ref('Section'),  subject: ref('Subject'),  date: { type: String, required: true },  session: { type: String, required: true },  status: {    type: String,    enum: ['present', 'absent', 'late', 'leave'],    required: true  },  reason: String,  markedAt: { type: Date, default: Date.now }}, opts);
attendanceSchema.index(  { student: 1, subject: 1, date: 1, session: 1 },  { unique: true });
export const Attendance = model('Attendance', attendanceSchema);
export const AttendanceRequest=model('AttendanceRequest',new Schema({student:ref('Student'),attendance:ref('Attendance',false),subject:ref('Subject'),date:String,session:{type:String,required:true},requestedStatus:{type:String,enum:['present','absent','late','leave']},reason:{type:String,required:true},status:{type:String,enum:['pending','approved','rejected'],default:'pending'},reviewedBy:ref('User',false),reviewNote:String},opts));
export const Notice=model('Notice',new Schema({title:{type:String,required:true},body:{type:String,required:true},audience:{type:String,enum:['all','students','faculty','department'],default:'all'},department:ref('Department',false),createdBy:ref('User')},opts));
export const Notification=model('Notification',new Schema({user:ref('User'),title:String,message:String,read:{type:Boolean,default:false}},opts));
export const AuditLog=model('AuditLog',new Schema({actor:ref('User'),action:String,entity:String,entityId:String,details:Schema.Types.Mixed,ip:String},opts));
