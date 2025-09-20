import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(401,"Invalid videoId!!");
    }

    const likeObject = {
        video:videoId,
        likedBy:req?.user._id
    }
    
    const isLiked = await Like.findOneAndDelete(likeObject);

    if(!isLiked){
        const like = await Like.create(likeObject);
        if(!like){
            throw new ApiError(500,"Something went wrong while liking!!");
        }
        return res.status(200)
        .json({message:"liked"});
    }
    return res.status(200)
    .json({message:"unliked"});
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    if(!commentId || !isValidObjectId(commentId)){
        throw new ApiError(401,"Invalid videoId!!");
    }
    
    const likeObject = {
        comment:commentId,
        likedBy:req?.user._id
    }
    
    const isLiked = await Like.findOneAndDelete(likeObject);

    if(!isLiked){
        const like = await Like.create(likeObject);
        if(!like){
            throw new ApiError(500,"Something went wrong while liking!!");
        }
        return res.status(200)
        .json({message:"liked"});
    }
    return res.status(200)
    .json({message:"unliked"});
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    if(!tweetId || !isValidObjectId(tweetId)){
        throw new ApiError(401,"Invalid videoId!!");
    }
    
    const likeObject = {
        tweet:tweetId,
        likedBy:req?.user._id
    }
    
    const isLiked = await Like.findOneAndDelete(likeObject);

    if(!isLiked){
        const like = await Like.create(likeObject);
        if(!like){
            throw new ApiError(500,"Something went wrong while liking!!");
        }
        return res.status(200)
        .json({message:"liked"});
    }
    return res.status(200)
    .json({message:"unliked"});
})

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const videos = await Like.aggregate([
        {
            $match:{
                likedBy:req?.user._id,
                video: { $ne: null }
            }
        },
        {
            $lookup:{
                from:"videos",
                foreignField:"_id",
                localField:"video",
                as:"video",
                pipeline:[
                    {
                        $project:{
                            videoFile:1,
                            title:1,
                            duration:1
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                videoUrl:"$video.videoFile",
                title:"$video.title",
                duration:"$video.duration"
            }
        },
        {
            $project:{
                videoUrl:1,
                title:1,
                duration:1
            }
        }
    ]);

    if(!videos){
        throw new ApiError(500,"Something went wrong while fetching liking videos!!");
    }

    return res.status(200)
    .json(new ApiResponse(200,videos,"Liked videos fetched"));
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}