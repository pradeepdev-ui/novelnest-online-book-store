import mongoose from 'mongoose';
const schema=new mongoose.Schema({title:{type:String,required:true},author:{type:String,required:true},category:{type:String,required:true},price:{type:Number,required:true,min:0},rating:{type:Number,default:4.5,min:0,max:5},description:String,image:String,featured:{type:Boolean,default:false},stock:{type:Number,default:20,min:0}},{timestamps:true});
export default mongoose.model('Book',schema);
