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

const loginUser = asyncHandler( async(req,res) => {
  const { username,email,password } = req.body;

  if(!(username || email)){
    throw new ApiError(400,"email or username required!")
  }

  const user = await User.findOne({$or:[{username},{email}]});
  if(!user){
    throw new ApiError(404,"user does not exist!");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if(!isPasswordValid){
    throw new ApiError(401,"incorrect password")
  }

  const {accessToken,refreshToken} = await user.generateAccessAndRefreshToken(user._id);
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  const options = {
    httpOnly:true,
    secure:true
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {user:loggedInUser,accessToken,refreshToken},
        "user logged in successfully."
      )
    )
})



export {
  generateAccessAndRefreshToken,
  checkUniqueUser,
  registerUser,
  loginUser
}