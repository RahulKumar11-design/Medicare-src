import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const stats = await User.aggregate([
        {
            $match:{ _id: new mongoose.Types.ObjectId(req?.user._id) }
        },
        {
            $lookup:{
                from:"subscriptions",
                foreignField:"channel",
                localField:"_id",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"videos",
                foreignField:"owner",
                localField:"_id",
                as:"videos",
                pipeline:[
                    {
                        $lookup:{
                            from:"likes",
                            foreignField:"video",
                            localField:"_id",
                            as:"likes"
                        }
                    },
                    {
                        $addFields:{
                            likes:{
                                $size:"$likes"
                            }
                        }
                    },
                    {
                        $project:{
                            views:1,
                            likes:1
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                subscriberCount:{
                    $size:"$subscribers"
                },
                videoCount:{
                    $size:"$videos"
                },
                totalViews:{
                    $sum:{
                        $map:{
                            input:"$videos",
                            as:"v",
                            in:"$$v.views"
                        }
                    }
                },
                totalLikes:{
                    $sum:{
                        $map:{
                            input:"$videos",
                            as:"$v",
                            in:"$$v.likes"
                        }
                    }
                }
            }
        },
        {
            $project:{
                username:1,
                email:1,
                fullname:1,
                videoCount:1,
                subscriberCount:1,
                totalLikes:1,
                totalViews:1
            }
        }
    ]);

    if(!stats){
        throw new ApiError(500,"Something went wrong while fetching stats!!");
    }

    return res.status(200)
    .json(new ApiResponse(200,stats[0],"channel stats fetched successfully!!"));
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel

    const videos = await Video.aggregate([
        {
            $match: {owner:new mongoose.Types.ObjectId(req?.user._id)}
        },
        {
            $project:{
                videoFile:1,
                title:1,
                duration:1,
                views:1
            }
        }
    ]);
    
    if(!videos){
        throw new ApiError(500,"Something went wrong while fetching videos!!");
    }

    return res.status(200)
    .json(new ApiResponse(201,videos,"Videos fetched successfully"));
})

export {
    getChannelStats, 
    getChannelVideos
}