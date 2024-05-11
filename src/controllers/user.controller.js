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




export {
  generateAccessAndRefreshToken,
  checkUniqueUser
}