import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const { Schema } = mongoose;

const userSchema = new Schema({
  username: {
    type:String,
    required:true,
    unique:true,
    lowercase:true,
    trim:true,
    index:true
  },
  name: {
    type:String,
    required:true,
    trim:true,
    index:true
  },
  email: {
    type:String,
    required: true,
    unique:true,
    trim:true
  },
  password: {
    type: String,
    required: [true, "Password is required."]
  },
  isVerified: {
    
  },
  verifyCode: {

  }
},{timestamps:true})
