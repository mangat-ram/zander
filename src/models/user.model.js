import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const { Schema } = mongoose;

const userSchema = new Schema(
  {
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
      type:Boolean,
      default:false
    },
    verifyCode: {
      type: String,
      required: [true, "verify code is required."]
    },
    verifyCodeExpiry: {
      type: Date,
      required: [true, "verify code expiry is required."]
    },
    refreshToken: {
      type: String
    },
    messages:[
      {
        type:Schema.Types.ObjectId,
        ref:"Messages"
      }
    ]
  },{timestamps:true}
);

// Method to check whether password is modified or not, if not hash the password
userSchema.pre("save", async function(next){
  if(!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
})

//Method to check is password correct
userSchema.methods.isPasswordCorrect = async function(password){
  return await bcrypt.compare(password, this.password);
} 

//Method to generate access token
userSchema.methods.generateAccessToken = function(){
  return jwt.sign(
    {
      _id:this._id,
      email:this.email,
      username:this.username,
      name:this.name
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
  )
}

//Method to generate access token
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    }
  );
};

//update user when messages
userSchema.statics.updateMessages = async function(userId,messageId){
  return await this.findByIdAndUpdate(userId,{ $push: {messages: messageId}},
    {new: true}
  )
}

export const User = mongoose.model("User",userSchema);
