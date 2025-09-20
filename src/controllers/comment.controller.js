import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query
    if(!videoId && isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid videoId!!");
    }

    const comments = await Comment.find({video:videoId}).skip((page-1)*limit).limit(limit);

    if(!comments){
        throw new ApiError(400,"Something went wrong while fetching comments!!");
    }

    return res.status(200)
    .json(new ApiResponse(200,comments,"Comments fetched successfully!!"));
})

const addComment = asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    const {content} = req.body;
    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid videoId!!");
    }
    if(!content || !content?.trim()){
        throw new ApiError(400,"All content field can't be empty!!");
    }
    const comment = await Comment.create({
        video:videoId,
        content,
        owner:req?.user._id
    });
    if(!comment){
        throw new ApiError(500,"Something went wrong while storing comment in db!!");
    }

    return res.status(200)
    .json(new ApiResponse(200,comment,"comment created"));
})

const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params;
    const {content} = req.body;
    if(!commentId || !isValidObjectId(commentId)){
        throw new ApiError(400,"Invalid comment id!!");
    }
    const commentBeforeUpdate = await Comment.findById(commentId).select("owner");

    if(!commentBeforeUpdate){
        throw new ApiError(400,"comment is missing!!");
    }

    if(commentBeforeUpdate.owner!==req?.user._id){
        throw new ApiError(401,"Unauthorised request!!");
    }

    if(!content || !content?.trim()){
        throw new ApiError(400,"All content field can't be empty!!");
    }

    const comment = await Comment.findByIdAndUpdate(
        commentId,
        {$set:{content}},
        {new:true}
    )
    if(!comment){
        throw new ApiError(500,"Something went wrong while updating comment in db!!");
    }
    return res.status(200)
    .json( new ApiResponse(200,comment,"comment updated successfully") );
})

const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params;
    if(!commentId || !isValidObjectId(commentId)){
        throw new ApiError(400,"Invalid comment id!!");
    }
    const commentBeforeUpdate = await Comment.findById(commentId).select("owner");

    if(!commentBeforeUpdate){
        throw new ApiError(400,"comment is missing!!");
    }

    if(commentBeforeUpdate.owner!==req?.user._id){
        throw new ApiError(401,"Unauthorised request!!");
    }

    const comment = await Comment.findByIdAndDelete(commentId);

    if(!comment){
        throw new ApiError(500,"Something went wrong while deleting comment in db!!");
    }

    return res.status(200)
    .json(new ApiResponse(200,{},"Comment deleted successfully!!"));
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
}