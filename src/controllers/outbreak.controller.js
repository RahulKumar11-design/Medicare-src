import {Report} from "../models/report.model.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getAlerts = asyncHandler(async (req, res) => {
    // TODO: Get all cases on given location

    const { location } = req.params;
    const hoursBack = req.query.hours || 24;
        
    const outbreakData = await getOutbreakCasesForLocation(location, hoursBack);
        
        // Check if any disease crosses alert threshold
    const alerts = outbreakData.filter(item => item.count >= 8);

    return res.status(200)
    .json(new ApiResponse(201,{
            location: location,
            timeframe: `Last ${hoursBack} hours`,
            alerts: alerts,
            totalReports: outbreakData.reduce((sum, item) => sum + item.count, 0)
        },"Videos fetched successfully"));
});

// Function to get outbreak cases for a specific location
async function getOutbreakCasesForLocation(targetLocation, hoursBack = 24) {
    try {
        // Calculate cutoff time (24 hours ago by default)
        const cutoff = new Date();
        cutoff.setHours(cutoff.getHours() - hoursBack);

        // MongoDB aggregation pipeline
        const outbreakData = await Report.aggregate([
            {
                // Filter by location and time
                $match: {
                    location: targetLocation,
                    timestamps: { $gte: cutoff }
                }
            },
            {
                // Group by disease and count cases
                $group: {
                    _id: "$disease",
                    count: { $sum: 1 },
                    location: { $first: "$location" }
                }
            },
            {
                // Reshape the output
                $project: {
                    _id: 0,
                    disease: "$_id",
                    location: "$location",
                    count: "$count"
                }
            },
            {
                // Sort by count (highest first)
                $sort: { count: -1 }
            }
        ]);

        return outbreakData;
    } catch (error) {
        console.error('Error fetching outbreak data:', error);
        throw error;
    }
}

export {
    getAlerts
}