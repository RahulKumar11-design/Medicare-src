import { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {content} = req.body;
   
    if(!content || !content?.trim()){
        throw new ApiError(400,"All content field can't be empty!!");
    }
    const tweet = await Tweet.create({
        content,
        owner:req?.user._id
    });
    if(!tweet){
        throw new ApiError(500,"Something went wrong while storing tweet in db!!");
    }

    return res.status(200)
    .json(new ApiResponse(200,tweet,"tweet created"));
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId} = req.params;
    if(!userId || !isValidObjectId(userId)){
        throw new ApiError("Invalid userId");
    }
    const tweets = await Tweet.find({owner:userId});

    if(!tweets){
        throw new ApiError(500,"Something went wront while fetching tweets!");
    }

    return res.status(200)
    .json(new ApiResponse(200,tweets,"Tweets fetched successfully"));
})

const updateTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params;
    const {content} = req.body;
    if(!tweetId || !isValidObjectId(tweetId)){
        throw new ApiError(400,"Invalid tweetId!!");
    }
    const tweetBeforeUpdate = await Tweet.findById(tweetId).select("owner");

    if(!tweetBeforeUpdate){
        throw new ApiError(400,"tweet is missing!!");
    }

    if(tweetBeforeUpdate.owner!==req?.user._id){
        throw new ApiError(401,"Unauthorised request!!");
    }

    if(!content || !content?.trim()){
        throw new ApiError(400,"All content field can't be empty!!");
    }

    const tweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {$set:{content}},
        {new:true}
    )
    if(!tweet){
        throw new ApiError(500,"Something went wrong while updating tweet in db!!");
    }
    return res.status(200)
    .json( new ApiResponse(200,tweet,"tweet updated successfully") );
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId} = req.params;
    if(!tweetId || !isValidObjectId(tweetId)){
        throw new ApiError(400,"Invalid tweetId!!");
    }
    const tweetBeforeUpdate = await Tweet.findById(tweetId).select("owner");

    if(!tweetBeforeUpdate){
        throw new ApiError(400,"tweet is missing!!");
    }

    if(tweetBeforeUpdate.owner!==req?.user._id){
        throw new ApiError(401,"Unauthorised request!!");
    }

    const tweet = await Tweet.findByIdAndDelete(tweetId)
    if(!tweet){
        throw new ApiError(500,"Something went wrong while deleting tweet in db!!");
    }

    return res.status(200)
    .json( new ApiResponse(200,{},"tweet deleted successfully") );
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}