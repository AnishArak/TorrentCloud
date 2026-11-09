import mongoose from 'mongoose';
const schema=new mongoose.Schema({
  userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},name:String,gid:String,status:{type:String,default:'queued'},errorMessage:String,progress:{type:Number,default:0},
  totalSize:{type:Number,default:0},completedSize:{type:Number,default:0},downloadSpeed:{type:Number,default:0},uploadSpeed:{type:Number,default:0},eta:String,
  storagePath:String,downloadToken:String,expiresAt:Date,files:[Object],createdAt:{type:Date,default:Date.now},completedAt:Date,
  maxDownloadSpeed:{type:Number,default:null},reservedSize:{type:Number,default:0},storageReserved:{type:Boolean,default:false},analysis:{type:mongoose.Schema.Types.Mixed}
});
export default mongoose.model('Download',schema);
