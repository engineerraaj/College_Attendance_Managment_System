import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
export async function protect(req,res,next){
 try{
  const token=req.headers.authorization?.startsWith('Bearer ')?req.headers.authorization.split(' ')[1]:null;
  if(!token) return res.status(401).json({message:'Authentication required'});
  const decoded=jwt.verify(token,process.env.JWT_SECRET);
  const user=await User.findById(decoded.id).select('-password');
  if(!user || !user.active) return res.status(401).json({message:'Account unavailable'});
  req.user=user; next();
 }catch(e){return res.status(401).json({message:'Invalid or expired token'});}
}
export const allow=(...roles)=>(req,res,next)=>roles.includes(req.user.role)?next():res.status(403).json({message:'Forbidden'});
export function departmentScope(req,res,next){
 if(req.user.role==='hod'){
  const ids=(req.user.departments || []).map(x=>String(x));
  if(req.query.department && !ids.includes(req.query.department)) return res.status(403).json({message:'Department access denied'});
  req.hodDepartments=ids;
 }
 next();
}
