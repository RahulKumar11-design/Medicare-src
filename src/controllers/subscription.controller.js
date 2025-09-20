import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(!channelId || !isValidObjectId(channelId)){
        throw new ApiError(400,"Invalid channel id!!");
    }
    // if subscription available then delete subscription document
    // containing user._id and channelId
    const subscriptionObject = {
        subscriber:req?.user._id,
        channel:channelId
    }

    const isSubscriptionAvailable = await Subscription.findOneAndDelete(subscriptionObject);
    //if not found then make subscription
    if(!isSubscriptionAvailable){
        const subscription = await Subscription.create(subscriptionObject);

        if(!subscription){
            throw new ApiError(500,"Something went wrong while creating subscription!!");
        }
    }

    return res.status(200)
    .json(new ApiResponse(201,{},"Subsription toggled successfully"));
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params;
    if(!channelId || !isValidObjectId(channelId)){
        throw new ApiError(400,"Invalid channel id!!");
    }

    const subscribers = await Subscription.aggregate([
        {
            $match:{
                channel:new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"subscriber",
                foreignField:"_id",
                as:"subscriber",
                pipeline:[
                    {
                        $project:{
                            username:1,
                            email:1,
                            avatar:1
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                username:"$subscriber.username",
                email:"$subscriber.email",
                avatar:"$subscriber.avatar"
                // implicitely works as username: { $arrayElemAt: ["$subscriber.username", 0] } 
            }
        },
        {
            $project:{
                username:1,
                email:1,
                avatar:1
            }
        }
    ]);

    if(!subscribers ||  !Array.isArray(subscribers)){
        throw new ApiError(404,"Something went wrong while fetching subscribers!!");
    }

    return res.status(200)
    .json(new ApiResponse(200,subscribers,"Subscribers fetched successfully"));
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;
    if(!subscriberId || !isValidObjectId(subscriberId)){
        throw new ApiError(400,"Invalid channel id!!");
    }

    const channels = await Subscription.aggregate([
        {
            $match:{
                subscriber:new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"channel",
                foreignField:"_id",
                as:"channel",
                pipeline:[
                    {
                        $project:{
                            username,
                            avatar
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                username:"$channel.username",
                avatar:"$channel.avatar"
            }
        },
        {
            $project:{
                username:1,
                avatar:1
            }
        }
    ])

    if(!channels || !Array.isArray(channels)){
        throw new ApiError(404,"Something went wrong while fetching channels!!");
    }

    return res.status(200)
    .json(new ApiResponse(201,channels,"Channels fetched successfully!!"));
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}