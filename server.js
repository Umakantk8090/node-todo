const { log } = require("console");
const express=require("express");
require("dotenv").config()
const mongoose=require("mongoose");

//file imports
const { userDataValidate } = require("./utills/authUtill");
const userModel = require("./models/userModel");

//constant
const app=express();
const PORT=process.env.PORT

//db connection
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("mongodb connected successfully"))
.catch((err)=>console.log(err));

//midddleware
app.set("view engine", "ejs")
app.use(express.urlencoded({ extended: true}))
app.use(express.json());
//APIs


app.get("/register", (req,res)=>{
    return res.render("registerPage");
})
app.get("/login", (req,res)=>{
    return res.render("loginPage");
})

app.post("/register", async (req, res)=>{
    console.log(req.body);
    const { name, email, username, password} =req.body;
   try {
    await userDataValidate({ name, email, username, password })
   } catch (error) {
    return res.status(400).json(error)
   }
   const userObj = new userModel({
    name:name,
    email:email,
    username:username,
    password:password
   })

   try {
    const userDb=await userObj.save();
    return res.status(201).json({
        message:"register successfully",
        data:userDb,
    })
   } catch (error) {
    return res.status(500).json({
        message:"Internal server error",
        error:error,
    })
   }
   
})
app.listen(PORT, ()=>{
    console.log(`server running on ${PORT}`);
    
})