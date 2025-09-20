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

const deleteFile = async (url) => {
    try {
        // Step 1: Extract the part after "/upload/"
        const parts = url.split("/upload/");
        if (parts.length < 2){
            throw new ApiError(500,"Invalid url!!");
        }

        let public_id_with_ext = parts[1]; // e.g. "v1629308745/myfolder/video_file.mp4"

        // Step 2: Remove version prefix if exists (like v1234/)
        public_id_with_ext = public_id_with_ext.replace(/^v\d+\//, ''); // removes version

        // Step 3: Remove extension
        const public_id = public_id_with_ext.replace(/\.(mp4|ogv|webm|jpg)$/, '');

        const result = await cloudinary.uploader.destroy(public_id);
        return result;
    } catch (error) {
        throw new ApiError(500,error.message || "Something went wrong while getting public_id!!");
    }
}

const updateUserAvatar = asyncHandler(async (req,res) => {
    const avatarLocalUrl = req?.file?.path;

    if(!avatarLocalUrl){
        throw new ApiError(400,"avatar file is required!!");
    }

    const avatar = await uploadOnCloudinary(avatarLocalUrl);

    if(!avatar){
        throw new ApiError(500,"something went wrong while uploading avatar file!!");
    }

    const userBeforeUpdate = await User.findById(req?.user._id).select("avatar");

    const user = await User.findByIdAndUpdate(
        req?.user._id,
        {$set:{avatar:avatar.url}},
        {new:true}
    ).select("-password -refreshToken");

    if(!user){
        throw new ApiError(501,"Something went wrong while updating avatar!!");
    }

    // delete oldAvatar
    const result = await deleteFile(userBeforeUpdate.avatar);
    console.log(result);

    return res.status(200)
    .json(new ApiResponse(201,user,"Avatar file updated successfully"));
})

const updateUserCoverImage = asyncHandler(async (req,res) => {
    const coverImageLocalUrl = req?.file?.path;
    if(!coverImageLocalUrl){
        throw new ApiError(400,"coverImage file is required!!");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalUrl);

    if(!coverImage){
        throw new ApiError(500,"something went wrong while uploading coverImage file!!");
    }

    const userBeforeUpdate = await User.findById(req?.user._id).select("coverImage");

    const user = await User.findByIdAndUpdate(
        req?.user._id,
        {$set:{coverImage:coverImage.url}},
        {new:true}
    ).select("-password -refreshToken");

    if(!user){
        throw new ApiError(501,"Something went wrong while updating coverImage!!");
    }

    // delete oldCoverImage
    const result = await deleteFile(userBeforeUpdate.coverImage);
    console.log(result);

    return res.status(200)
    .json(new ApiResponse(201,user,"coverImage file updated successfully"));
})

const getUserChannelProfile = asyncHandler(async (req,res) => {
    const {username} = req.params;
    
    if(!username?.trim()){
        throw new ApiError(400,"username is invalid!!");
    }

    const channel = await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{
                            $in:[req?.user._id,"$subscribers.subscriber"]
                            // implicitely works as
                            // $in: [req?.user._id,{
                            //             $map: {
                            //             input: "$subscribers",
                            //             as: "s",
                            //             in: "$$s.subscriber"
                            //             }
                            //      }]
                        },
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                username:1,
                email:1,
                avatar:1,
                coverImage:1,
                watchHistory:1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1
            }
        }
    ]);

    if(!channel){
        throw new ApiError(401,"username is missing!!");
    }

    return res.status(200)
    .json(new ApiResponse(201,channel[0],"User channel fetched Successfully"));
})

const getWatchHistory = asyncHandler(async (req,res) => {

    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        username:1,
                                        fullname:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])
    // console.log(user);
    if(!user){
        throw new ApiError(500,"something went wrong while fetching history from db!!");
    }
    return res
    .status(200)
    .json(new ApiResponse(201,user[0].watchHistory,"user watchHistory fetched successsfully"));
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getCurrentUser,
    getUserChannelProfile,
    getWatchHistory
};