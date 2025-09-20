import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    if(!name || !description){
        throw new ApiError(400,"All fields are required!!");
    }

    const playlist = await Listing.create({
        name,
        description,
        owner:req?.user._id
    });

    if(!playlist){
        throw new ApiError(500,"Some error happens while making playlist!!");
    }

    return res.status(200)
    .json(new ApiResponse(200,playlist,"Playlist created successfully"));
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    
    if(!userId && isValidObjectId(userId)){
        throw new ApiError(400,"Invalid userId");
    }

    const playlists = await Playlist.find({owner:userId});

    if(!playlists){
        throw new ApiError(500,"Something went wrong while fetching playlists!!");
    }

    return res.status(200)
    .json(new ApiResponse(200,playlists,"Playlists fetched successfully"));
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    
    if(!playlistId && isValidObjectId(playlistId)){
        throw new ApiError(400,"Invalid playlistId");
    }

    const playlist = await Playlist.findById(playlistId);

    if(!playlist){
        throw new ApiError(500,"Something went wrong while fetching playlist!!");
    }

    return res.status(200)
    .json(new ApiResponse(200,playlist,"Playlist fetched successfully"));
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params;
    if(!videoId && isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid videoId");
    }

    if(!playlistId && isValidObjectId(playlistId)){
        throw new ApiError(400,"Invalid playlistId");
    }

    const playlist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet: { videos: videoId } // adds video only if not already present
        },
        { new: true }
    );

    if(!playlist){
        throw new ApiError(500,"Something went wrong while adding video to playlist!!");
    }

    return res.status(200)
    .json(new ApiResponse(200,playlist,"video added successfully"));
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params;

    if(!videoId && isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid videoId");
    }

    if(!playlistId && isValidObjectId(playlistId)){
        throw new ApiError(400,"Invalid playlistId");
    }

    const playlist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: { videos: videoId } // adds video only if not already present
        },
        { new: true }
    );

    if(!playlist){
        throw new ApiError(500,"Something went wrong while removing video to playlist!!");
    }

    return res.status(200)
    .json(new ApiResponse(200,playlist,"video removed successfully"));
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    
    if(!playlistId && isValidObjectId(playlistId)){
        throw new ApiError(400,"Invalid playlistId");
    }

    const playlist = await Playlist.findByIdAndDelete(playlistId);

    if(!playlist){
        throw new ApiError(500,"Something went wrong while deleting playlist!!");
    }

    return res.status(200)
    .json({message:"playlist deleted successfully"});
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    
    if(!playlistId && isValidObjectId(playlistId)){
        throw new ApiError(400,"Invalid playlistId");
    }

    if(!name || !description){
        throw new ApiError(400,"All fields are required!!");
    }

    const playlist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set:{
                name,description
            }
        },
        { new: true }
    );

    if(!playlist){
        throw new ApiError(500,"Something went wrong while updating playlist!!");
    }

    return res.status(200)
    .json(new ApiResponse(200,playlist,"playlist updated successfully"));
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}