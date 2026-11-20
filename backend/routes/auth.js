import {Router} from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {body,validationResult} from 'express-validator';
import {User,Student,Faculty} from '../models/index.js';
import {protect} from '../middleware/auth.js';
const r=Router();
r.post('/login',[body('email').isEmail().normalizeEmail(),body('password').isLength({min:1})],async(req,res,next)=>{
 try{
  const errors=validationResult(req); if(!errors.isEmpty()) return res.status(400).json({errors:errors.array()});
  const user=await User.findOne({email:req.body.email}).select('+password');
  if(!user||!user.active||!(await bcrypt.compare(req.body.password,user.password))) return res.status(401).json({message:'Invalid email or password'});
  user.lastLogin=new Date(); await user.save();
  const token=jwt.sign({id:user._id,role:user.role},process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRES_IN||'8h'});
  res.json({token,user:{id:user._id,name:user.name,email:user.email,role:user.role}});
 }catch(e){next(e);}
});
r.get('/me',protect,async(req,res)=>res.json({user:req.user}));
r.patch('/password',protect,async(req,res,next)=>{
 try{const {currentPassword,newPassword}=req.body;if(!newPassword||newPassword.length<10)return res.status(400).json({message:'New password must be at least 10 characters'});
 const u=await User.findById(req.user._id).select('+password');if(!await bcrypt.compare(currentPassword,u.password))return res.status(400).json({message:'Current password is incorrect'});
 u.password=await bcrypt.hash(newPassword,12);await u.save();res.json({message:'Password updated'});}catch(e){next(e);}
});
export default r;
