import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from './models/User.js';
import Book from './models/Book.js';
import Order from './models/Order.js';
dotenv.config();
const app=express();
app.use(cors({origin:process.env.CLIENT_URL||'*'}));app.use(express.json());
const sample=[
['The Midnight Library','Matt Haig','Fiction',499,4.7,'A beautiful story about choices and the lives we might have lived.','https://covers.openlibrary.org/b/isbn/9780525559474-L.jpg',true,18],
['Atomic Habits','James Clear','Self Help',399,4.8,'A practical guide to building good habits through small changes.','https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg',true,25],
['Ikigai','Héctor García & Francesc Miralles','Lifestyle',299,4.5,'A gentle exploration of purpose, balance and the Japanese concept of ikigai.','https://covers.openlibrary.org/b/isbn/9780143130727-L.jpg',true,22],
['The Alchemist','Paulo Coelho','Fiction',349,4.7,'A timeless journey about dreams, courage and listening to your heart.','https://covers.openlibrary.org/b/isbn/9780062315007-L.jpg',false,16],
['Deep Work','Cal Newport','Productivity',449,4.6,'Rules for focused success in a distracted world.','https://covers.openlibrary.org/b/isbn/9781455586691-L.jpg',false,14],
['Clean Code','Robert C. Martin','Technology',699,4.8,'A classic guide to writing readable, maintainable software.','https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg',false,12],
['The Psychology of Money','Morgan Housel','Finance',499,4.7,'Timeless lessons on wealth, greed, risk and better decisions.','https://covers.openlibrary.org/b/isbn/9780857197689-L.jpg',false,20],
['Rich Dad Poor Dad','Robert T. Kiyosaki','Finance',379,4.5,'An accessible introduction to financial thinking and personal wealth.','https://covers.openlibrary.org/b/isbn/9781612681139-L.jpg',false,19]
].map(x=>({title:x[0],author:x[1],category:x[2],price:x[3],rating:x[4],description:x[5],image:x[6],featured:x[7],stock:x[8]}));
let mongoReady=false;
const tokenFor=u=>jwt.sign({id:u._id,role:u.role,name:u.name,email:u.email},process.env.JWT_SECRET||'dev-secret',{expiresIn:'7d'});
async function auth(req,res,next){try{const h=req.headers.authorization||'';if(!h.startsWith('Bearer '))return res.status(401).json({message:'Login required'});req.user=jwt.verify(h.slice(7),process.env.JWT_SECRET||'dev-secret');next()}catch{return res.status(401).json({message:'Invalid or expired token'})}}
function admin(req,res,next){if(req.user.role!=='admin')return res.status(403).json({message:'Admin only'});next()}
app.get('/api/health',(req,res)=>res.json({ok:true,mongoReady}));
app.post('/api/auth/register',async(req,res)=>{try{const {name,email,password}=req.body;if(!name||!email||!password)return res.status(400).json({message:'All fields are required'});if(!mongoReady)return res.status(503).json({message:'MongoDB is required for accounts. Start MongoDB and restart the server.'});if(await User.findOne({email}))return res.status(409).json({message:'Email already registered'});const u=await User.create({name,email,password:await bcrypt.hash(password,10)});res.status(201).json({user:{name:u.name,email:u.email,role:u.role},token:tokenFor(u)})}catch(e){res.status(500).json({message:'Registration failed'})}});
app.post('/api/auth/login',async(req,res)=>{try{if(!mongoReady)return res.status(503).json({message:'MongoDB is required for login.'});const u=await User.findOne({email:req.body.email});if(!u||!(await bcrypt.compare(req.body.password,u.password)))return res.status(401).json({message:'Invalid email or password'});res.json({user:{name:u.name,email:u.email,role:u.role},token:tokenFor(u)})}catch{res.status(500).json({message:'Login failed'})}});
app.get('/api/books',async(req,res)=>{const {q='',category='All'}=req.query;try{if(mongoReady){const filter={};if(category&&category!=='All')filter.category=category;if(q)filter.$or=[{title:new RegExp(q,'i')},{author:new RegExp(q,'i')}];return res.json(await Book.find(filter).sort({featured:-1,createdAt:-1}))}res.json(sample.filter(b=>(category==='All'||!category||b.category===category)&&(!q||`${b.title} ${b.author}`.toLowerCase().includes(q.toLowerCase()))))}catch{res.status(500).json({message:'Could not load books'})}});
app.get('/api/books/:id',async(req,res)=>{try{const b=mongoReady?await Book.findById(req.params.id):sample.find(x=>x._id===req.params.id||x.title===req.params.id);if(!b)return res.status(404).json({message:'Book not found'});res.json(b)}catch{res.status(404).json({message:'Book not found'})}});
app.post('/api/books',auth,admin,async(req,res)=>{if(!mongoReady)return res.status(503).json({message:'MongoDB required'});res.status(201).json(await Book.create(req.body))});
app.put('/api/books/:id',auth,admin,async(req,res)=>{if(!mongoReady)return res.status(503).json({message:'MongoDB required'});const b=await Book.findByIdAndUpdate(req.params.id,req.body,{new:true});res.json(b)});
app.delete('/api/books/:id',auth,admin,async(req,res)=>{if(!mongoReady)return res.status(503).json({message:'MongoDB required'});await Book.findByIdAndDelete(req.params.id);res.json({message:'Deleted'})});
app.post('/api/orders',auth,async(req,res)=>{try{if(!mongoReady)return res.status(503).json({message:'MongoDB required for orders'});const {items,customer}=req.body;if(!items?.length)return res.status(400).json({message:'Cart is empty'});const total=items.reduce((s,i)=>s+i.price*i.qty,0);const order=await Order.create({userId:req.user.id,customer,items,total});res.status(201).json(order)}catch{res.status(500).json({message:'Could not place order'})}});
app.get('/api/orders/my',auth,async(req,res)=>{if(!mongoReady)return res.json([]);res.json(await Order.find({userId:req.user.id}).sort({createdAt:-1}))});
app.get('/api/orders',auth,admin,async(req,res)=>{if(!mongoReady)return res.json([]);res.json(await Order.find().sort({createdAt:-1}))});
app.patch('/api/orders/:id',auth,admin,async(req,res)=>{if(!mongoReady)return res.status(503).json({message:'MongoDB required'});res.json(await Order.findByIdAndUpdate(req.params.id,{status:req.body.status},{new:true}))});
async function start(){try{if(process.env.MONGO_URI){await mongoose.connect(process.env.MONGO_URI);mongoReady=true;const c=await Book.countDocuments();if(c===0)await Book.insertMany(sample);console.log('MongoDB connected')}else console.log('No MONGO_URI: demo catalog mode')}catch(e){console.log('MongoDB unavailable: demo catalog mode')}}
const PORT=process.env.PORT||5000;app.listen(PORT,()=>{console.log(`NovelNest API: http://localhost:${PORT}`);start()});
