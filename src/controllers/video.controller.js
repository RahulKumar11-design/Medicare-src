import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy='createdAt', sortType='asc', userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    const filter = {};
    if (query) {
        filter.title = { $regex: query, $options: "i" }; // Case-insensitive search on title
    }

    if (userId && isValidObjectId(userId)) {
        filter.owner = new mongoose.Types.ObjectId(userId);
    }
    if(!filter){
        throw new ApiError(400,"Invalid search query!!");
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortType === "asc" ? 1 : -1;

    const results = await Video.aggregate([
        {
            $match: filter
        },
        {
            $sort:sortOptions
        },
        {
            $skip: (page - 1) * limit 
        },
        {
            $limit: limit
        }
    ]);

    if(!results){
        throw new ApiError(500,"Something went wrong while fetching videos!!");
    }

    return res.status(200)
    .json(new ApiResponse(201,results,"Videos fetched successfully"));
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description,thumbnail} = req.body;
    if(!title || !description){
        throw new ApiError(400,"All fields are required");
    }
    // console.log(req?.file);
    const videoLocalUrl = req?.file?.path;

    if(!videoLocalUrl){
        throw new ApiError(400,"Video field is empty!!");
    }

    const videoFile = await uploadOnCloudinary(videoLocalUrl);

    if(!videoFile){
        throw new ApiError(401,"Something went wrong while uploading video!!");
    }

    const video = await Video.create({
        videoFile:videoFile.url,
        title,
        description,
        thumbnail,
        duration:videoFile.duration,
        owner:req?.user._id
    });

    if(!video){
        throw new ApiError(401,"Something went wrong while storing video in db!!");
    }

    return res.status(200)
    .json(new ApiResponse(201,video,"Video published successfully"));
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid video id!!");
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(400,"Video is missing!!");
    }

    return res.status(200)
    .json(new ApiResponse(201,video,"Video fetched"));
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const {title,description,thumbnail} = req.body;

    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid video id!!");
    }
    if(!title || !description || !thumbnail){
        throw new ApiError(400,"All fields are required");
    }

    const videoObj = await Video.findById(videoId).select("owner");

    if(!videoObj){
        throw new ApiError(404,"Video is missing!!");
    }

    if(videoObj?.owner!==req?.user_id){
        throw new ApiError(401,"Unauthorised request!!");
    }

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set:{
                title,description,thumbnail
            }
        },
        {new:true}
    );

    return res.status(200)
    .json(new ApiResponse(201,video,"Video updated successfully"));
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    
    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(200,"Invalid video id!!");
    }
    const videoObj = await Video.findById(videoId).select("owner");

    if(!videoObj){
        throw new ApiError(404,"Video is missing!!");
    }

    if(videoObj?.owner!==req?.user_id){
        throw new ApiError(401,"Unauthorised request!!");
    }
    const video = await Video.findByIdAndDelete(videoId);

    if(!video){
        throw new ApiError(400,"Invalid id!!");
    }

    return res.status(200)
    .json({
        message:"Video deleted successfully"
    });
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid videoId!!"); 
    }

    const videoObj = await Video.findById(videoId).select("owner");

    if(!videoObj){
        throw new ApiError(404,"Video is missing!!");
    }

    if(videoObj?.owner!==req?.user_id){
        throw new ApiError(401,"Unauthorised request!!");
    }

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set:{
                isPublished:false
            }
        },
        {new:true}
    );

    return res.status(200)
    .json(new ApiResponse(201,video,"Video updated successfully"));
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}