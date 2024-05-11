import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshToken = async(userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave : false })

    return { accessToken, refreshToken }
  } catch (error) {
    throw new ApiError(500,"Something went wrong while genrating access and refresh token.!!!")
  }
}

const checkUniqueUser = asyncHandler( async(req,res) => {
  const { username } = req.params;
  const user = await User.findOne({username});
  if(user){
    return res
      .status(201)
      .json(
        new ApiResponse(200,{},"username already exists!")
      )
  }
  
  return res
    .status(201)
    .json(
      new ApiResponse(200,{},"username is available")
    )
})

const registerUser = asyncHandler(async(req,res) =>{
  const { username, name, email, password } = req.body;

  if([username, name, email, password].some((field) => {
    return field?.trim() === ""
  })){
    throw new ApiError (400,"all fields are required.")
  }

  const existedUser = await User.findOne({
    $or : [{username},{email},{verifyCode:true}]
  })

  if(existedUser){
    throw new ApiError(409,"user with email or username already exists.")
  }

  const verifyCode = Math.floor(100000 + Math.random() * 900000).toString()
  const verifyCodeExpiry = new Date();
  verifyCodeExpiry.setHours(verifyCodeExpiry.getHours() + 1);

  const user = await User.create({
    username:username.toLowerCase(),
    name,
    email,
    password,
    verifyCode,
    verifyCodeExpiry,
    isVerified:false
  })

  const createdUser = await User.findById(user._id).select(
    "-password refreshToken -verifyCode -verifyCodeExpiry"
  )

  if(!createdUser){
    throw new ApiError(500,"something went wrong while registering user.")
  }

  return res
    .status(201)
    .json(
      new ApiResponse(200,createdUser,"user regitered successfully.")
    )
})





export {
  generateAccessAndRefreshToken,
  checkUniqueUser,
  registerUser
}