import mongoose from 'mongoose';
const item=new mongoose.Schema({bookId:String,title:String,price:Number,qty:Number,image:String},{_id:false});
const schema=new mongoose.Schema({userId:{type:mongoose.Schema.Types.ObjectId,ref:'User'},customer:{name:String,email:String,address:String,phone:String},items:[item],total:Number,status:{type:String,enum:['Placed','Packed','Shipped','Delivered','Cancelled'],default:'Placed'}},{timestamps:true});
export default mongoose.model('Order',schema);
