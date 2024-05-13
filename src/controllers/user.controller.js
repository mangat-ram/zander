import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js";
import nodemailer from "nodemailer";
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

const verifyEmail = asyncHandler( async(req,res) => {
  const { username, code } = req.body;
  const decodedUsername = decodeURIComponent(username);
  const user = await User.findOne({username:decodedUsername});
  if(!user){
    return res
      .status(404)
      .json(
        new ApiResponse(404,{},"user not found.")
      )
  }

  const isCodeValid = user.verifyCode === code;
  const isCodeNotExpired = new Date(user.verifyCodeExpiry) > new Date();

  if (isCodeValid && isCodeNotExpired){
    user.isVerified = true;
    await user.save();

    return res
      .status(200)
      .json(
        new ApiResponse(200,{},"user verified successfully.")
      )
  }else if (!isCodeNotExpired) {
  return res
    .status(201)
    .json(
      new ApiResponse(200, {}, "User not found")
    )
  } else {
    return res
      .status(201)
      .json(
        new ApiResponse(200, {}, "Incorrect Verification code!")
      )
  }
})

const sendEmail = asyncHandler( async(req,res) => {
  const { to, subject, text } = req.body;
  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to,
    subject,
    text
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }
  })

  transporter.sendMail(mailOptions,(error,info) => {
    if (error){
      throw new ApiError(500,"something went wrong while sending email.")
    }else{
      return res
        .status(200)
        .json(
          new ApiResponse(200,{},`email sent successfully ${info.response}`)
        )
    }
  })
  
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

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {$set:{refreshToken:undefined}},
    {new:true}
  )

  const options = {
    httpOnly:true,
    secure:true
  }

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
      new ApiResponse(200, {}, "user logged out.")
    )
})

const refreshToken = asyncHandler(async(req,res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
  if(!incomingRefreshToken){
    throw new ApiError(401,"Unauthorized request!")
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )

    const user = await User.findById(decodedToken?._id)
    if(!user){
      throw new ApiError(401,"invalid refresh token!!!")
    }

    if(incomingRefreshToken !== user?.refreshToken){
      throw new ApiError(401,"refresh token is expired!!")
    }

    const options = {
      httpOnly:true,
      secure:true
    }

    const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken",accessToken,options)
      .cookie("refreshToken", newRefreshToken,options)
      .json(
        new ApiResponse(
          200,
          { accessToken,newRefreshToken },
          "access token refreshed successfully."
        )
      )
  } catch (error) {
    throw new ApiError(401, error?.message || "invalid refresh token catched!!")
  }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user?._id;

  // Find the user by ID
  const user = await User.findById(userId);

  // Check if the old password is correct
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password!");
  }

  // Update the user's password
  user.passWord = newPassword; // Update the password field directly

  // Save the user with the new password
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully."));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current User Fetched Successfully."))
})

export {
  generateAccessAndRefreshToken,
  checkUniqueUser,
  registerUser,
  verifyEmail,
  sendEmail,
  loginUser,
  logoutUser,
  refreshToken,
  changeCurrentPassword
}