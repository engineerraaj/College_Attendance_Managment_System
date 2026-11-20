import { AuditLog } from '../models/index.js';
export const audit=async(req,action,entity,entityId,details={})=>{
 try{await AuditLog.create({actor:req.user?._id,action,entity,entityId:String(entityId||''),details,ip:req.ip});}catch(e){console.error('Audit write failed',e.message);}
};
