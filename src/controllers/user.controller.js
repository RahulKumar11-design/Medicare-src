import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary,cloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const registerUser = asyncHandler( async (req,res) => {
    const {username,fullname,password,email} = req.body;
    // validation
    if(
        [username,fullname,password,email].some( 
            (field) => field?.trim()===""
        )
    ){
        throw new ApiError(400,"All fields are required!!");
    }
    // if user already exist
    const existedUser = await User.findOne({
        $or:[{username},{email}]
    })

    if(existedUser){
        throw new ApiError(409,"user already existed");
    }

    const avatarLocalUrl = req.files?.avatar[0]?.path;
    let coverImageLocalUrl=null;
    
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalUrl = req.files.coverImage[0].path;
    }

    if(!avatarLocalUrl){
        throw new ApiError(400,"Avatar file is required!");
    }

    const avatar = await uploadOnCloudinary(avatarLocalUrl);
    const coverImage = await uploadOnCloudinary(coverImageLocalUrl);

    if(!avatar){
        throw new ApiError(400,"Avatar file is required!!");
    }

    const user = await User.create({
        username:username.toLowerCase(),
        fullname,
        password,
        email,
        avatar:avatar.url,
        coverImage:coverImage?.url || ""
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if(!createdUser){
        throw new ApiError(500,"Something went wrong with registering the user!!");
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully")
    )
});

const generateRefreshAndAccessTokens = async (userId) => {
    try{
        const user = await User.findById(userId);

        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave:false});
        return {accessToken,refreshToken};
    }catch(error){
        throw new ApiError(500,error.message || "Something went wrong while generating access and refresh tokens!!");
    }
}

const loginUser = asyncHandler( async (req,res) => {
    const {username,email,password} = req.body;

    if(!username && !email){
        throw new ApiError(400,"username or email are required!");
    }

    const user = await User.findOne({
        $or : [{username},{email}]
    });

    if(!user){
        throw new ApiError(404,"user does not exit!!");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401,"password is incorrect!!");
    }

    const {accessToken,refreshToken} = await generateRefreshAndAccessTokens(user._id);
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    const options = {
        httpOnly:true,
        secure:true
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(new ApiResponse(
        201,
        {
            user:loggedInUser,
            accessToken,refreshToken
        },
        "User is successfully registered"
    ));
})

const logoutUser = asyncHandler( async (req,res) => {

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )

    const option = {
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .json(
        new ApiResponse(201,{},"User successfully logged Out")
    )
})

const refreshAccessToken = asyncHandler( async (req,res) =>{
    const incommingRefreshToken = req.cookies?.refreshToken || req.header("Authorisation").replace("Bearer ");

    if(!incommingRefreshToken){
        throw new ApiError(401,"Invalid Authorisation");
    }

    const decodedToken = jwt.verify(incommingRefreshToken,process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select("-password");

    if(!user){
        throw new ApiError(401,"Invalid refresh token");
    }

    if(incommingRefreshToken!==user.refreshToken){
        throw new ApiError(401,"Refresh Token is expired or used!!");
    }

    const {accessToken,refreshToken} = await generateRefreshAndAccessTokens(user._id);

    const options = {
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(201,{accessToken,refreshToken},"Access Token refreshed")
    )
})

const changeCurrentPassword = asyncHandler( async (req,res) => {
    const {oldPassword,newPassword} = req.body;

    const user = await User.findById(req?.user._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect){
        throw new ApiError(401,"oldPassword entered is incorrect!!");
    }

    user.password = newPassword;

    await user.save({validateBeforeSave:true});

    return res.status(200)
    .json(new ApiResponse(201,{},"Password is updated Successfully"));
})

const getCurrentUser = asyncHandler(async (req,res) => {
    return res.status(200)
    .json(new ApiResponse(201,req.user,"Current User fetched successfully"));
})

const updateAccountDetails = asyncHandler(async (req,res) => {
    const {email,fullname} = req.body;

    if(!email || !fullname){
        throw new ApiError(404,"All fields are required!!");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {$set:{email,fullname}},
        {new:true}
    ).select("-password -refreshToken");

    return res.status(200)
    .json(new ApiResponse(201,user,"Account details updated successfully"));
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    updateAccountDetails
};