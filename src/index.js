
// require('dotenv').config({path:'./env'})
import dotenv from "dotenv"
import connectDB from "./db/index.js"
dotenv.config({
    path:'./env'
})

import {app} from "./app.js"

const port = process.env.PORT || 8000
connectDB()
.then(()=>{
    app.on("error", (error)=>{
        console.log("error", error)
        throw error
    })
    app.listen(port,()=>{
        console.log(`application is listening on port : ${port}`);
        
    })
})
.catch((error)=>{
    console.log("MongoDB connection failed !!! ", error);
    
})










/*
//First method of connecting database
import express from "express"
const app = express()
(async()=>{
   try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

    app.on("error", (error)=>{
         console.log("error",error)
         throw error
    })
    app.listen(process.env.PORT, ()=>{
        console.log(`app is listening on ${process.env.PORT}`)
    })
    
   } catch (error) {
     console.log("error:",error)
     throw error
   }
})()
*/