import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import Joi from "joi";
import ffmpeg from 'fluent-ffmpeg';
import ffprobeStatic from 'ffprobe-static';

// Set ffprobe path from ffprobe-static
ffmpeg.setFfprobePath(ffprobeStatic.path);

// Your existing code
const getVideoDuration = (path) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(path, (err, metadata) => {
            if (err) return reject(err);
            resolve(metadata.format.duration); // Duration in seconds
        });
    });
};
const getAllVideos = asyncHandler(async (req, res) => {
    //TODO: get all videos based on query, sort, pagination
    // Joi schema for validating query parameters
    const validationSchema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).default(10),
        search: Joi.string().allow('').default(''),
        sortBy: Joi.string().valid('createdAt', 'title', 'description').default('createdAt'),
        sortType: Joi.string().valid('asc', 'desc').default('desc'),
        userId: Joi.string().optional(),
    });
    // id:6782ad710e34b529a5e35974

    // Validate body parameters
    const validatedBody = await validationSchema.validateAsync(req.body);

    const { page, limit, search, sortBy, sortType, userId } = validatedBody;

    try {
        const filters = {}
        if (search) {
            filters.$or = [
                { title: { $ragex: search, $options: 'i' } },
                { description: { $ragex: search, $options: 'i' } }
            ]
        }
        if (userId) {
            filters.owner = userId;
        }
        const sort = {};
        sort[sortBy] = sortType === 'asc' ? 1 : -1;

        const skip = (page - 1) * limit;


        const Videos = await Video.find(filters)
            .sort(sort)
            .skip(skip)
            .limit(limit);

        const total = await Video.countDocuments(filters);

        return res.status(200).json(new ApiResponse(200, {
            success: true,
            data: Videos,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        }, "Data Found sucessfully"))


    } catch (error) {
        throw new ApiError(500, error.message || 'Failed to fetch videos');
    }

})

const publishAVideo = asyncHandler(async (req, res) => {
    // TODO: get video, upload to cloudinary, create video
    const validationSchema = Joi.object({
        title: Joi.string().required(),
        description: Joi.string().required(),
    });
    const validatedBody = await validationSchema.validateAsync(req.body);

    const { title, description } = validatedBody

    let videoLocalPath;
    if (req.files && Array.isArray(req.files.videoFile) &&
        req.files.videoFile.length > 0) {
        videoLocalPath = req.files.videoFile[0].path;
    } else {
        throw new ApiError(400, "videoFile file is required")
    }
    let thumbnailPath;
    if (req.files && Array.isArray(req.files.thumbnail) &&
        req.files.thumbnail.length > 0) {
        thumbnailPath = req.files.thumbnail[0].path;
    } else {
        throw new ApiError(400, "thumbnail file is required")
    }

    try {
        const duration = await getVideoDuration(videoLocalPath);
        const video = await uploadOnCloudinary(videoLocalPath);
        const thumbnail = await uploadOnCloudinary(thumbnailPath);

        if (!video && !thumbnail) {
            throw new ApiError(500, "Failed to upload video and thumbnail to cloudinary")
        }
        const owner = req.user?._id;
        if (!owner) {
            throw new ApiError(401, "Unauthorized: Owner information is missing");
        }
        const videoData = await Video.create({
            title,
            description,
            videoFile: video.url,
            thumbnail: thumbnail.url,
            duration,
            owner
        });
        if (!videoData) {
            throw new ApiError(500, "Failed to publish video")
        }

        return res.status(201).json(new ApiResponse(200, videoData, "Video Published sucessfully"))


    } catch (error) {
        throw new ApiError(500, error)
    }
})

const getVideoById = asyncHandler(async (req, res) => {
    //TODO: get video by id
    const validationSchema = Joi.object({
        videoId: Joi.string().required(),
    });
    const validatedQuery = await validationSchema.validateAsync(req.query);
    const { videoId } = validatedQuery

    try {
        const video = await Video.findById(videoId)
        if (!video) {
            throw new ApiError(404, "Video not found")
        }
        return res.status(200).json(new ApiResponse(200, video, "Video found sucessfully"))
    } catch (error) {
        throw new ApiError(500, error.message || 'Failed to fetch video');
    }
})

const updateVideo = asyncHandler(async (req, res) => {
    //TODO: update video details like title, description, thumbnail
    const validationSchema = Joi.object({
        videoId: Joi.string().required(),

    });
    const validationBodySchema = Joi.object({
        title: Joi.string().optional(),
        description: Joi.string().optional(),


    });
    const validatedQuery = await validationSchema.validateAsync(req.query);
    const validatedBody = await validationBodySchema.validateAsync(req.body);
    const { videoId } = validatedQuery
    const { title, description } = validatedBody
    try {
        const video = await Video.findById(videoId)
        if (!video) {
            throw new ApiError(404, "Video not found")
        }
        if (title) video.title = title;
        if (description) video.description = description;

        let thumbnailPath;
        if (req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0) {
            thumbnailPath = req.files.thumbnail[0].path;

            // Upload the new thumbnail to Cloudinary
            const thumbnail = await uploadOnCloudinary(thumbnailPath);
            if (thumbnail && thumbnail.url) {
                video.thumbnail = thumbnail.url;
            } else {
                throw new ApiError(500, "Failed to upload thumbnail to Cloudinary");
            }
        }
        const updatedVideo = await video.save();

        return res.status(200).json(new ApiResponse(200, updatedVideo, "data updated sucessfully"))

    } catch (error) {
        throw new ApiError(500, error.message || 'Failed to fetch ');

    }

})

const deleteVideo = asyncHandler(async (req, res) => {
    //TODO: delete video
    const validationSchema = Joi.object({
        videoId: Joi.string().required(),
    });
    const validatedQuery = await validationSchema.validateAsync(req.query);
    const { videoId } = validatedQuery
    try {
        const video = await Video.findById(videoId)
        if (!video) {
            throw new ApiError(404, "data not found")
        }
        const deletedData = await video.remove();
        return res.status(200).json(new ApiResponse(200, deletedData, "data deleted sucessfully"));

    } catch (error) {
        throw new ApiError(500, error.message || 'Failed to fetch ');

    }
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const validationSchema = Joi.object({
        videoId: Joi.string().required(),
    });
    const validatedQuery = await validationSchema.validateAsync(req.query);
    const { videoId } = validatedQuery
    try {
        const video = await Video.findById(videoId)
        if (!video) {
            throw new ApiError(404, "data not found")
        }
        video.isPublished = !video.isPublished
        const updatedVideo = await video.save()
        return res.status(200).json(new ApiResponse(200, updatedVideo, "data updated sucessfully"))

    } catch (error) {
        throw new ApiError(500, error.message || 'Failed to fetch ');

    }
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}