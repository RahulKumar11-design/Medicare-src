import {Report} from "../models/report.model.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

// Update your getAlerts function to include disease info
const getAlerts = asyncHandler(async (req, res) => {
    const { location } = req.params;
    const hoursBack = req.query.hours || 24;
    
    const outbreakData = await getOutbreakCasesForLocation(location, hoursBack);
    
    // Enhanced alerts with severity and disease info
    const alerts = outbreakData
        .filter(item => item.count >= 1)
        .map(item => ({
            disease: item.disease,
            location: item.location,
            count: item.count,
            severity: calculateSeverity(item.count),
            trend: "STABLE", // You can enhance this
            lastReported: new Date().toISOString()
        }));

    return res.status(200).json({
        success: true,
        data: {
            location: location,
            timeframe: `Last ${hoursBack} hours`,
            alerts: alerts,
            totalReports: outbreakData.reduce((sum, item) => sum + item.count, 0),
            alertLevel: getOverallAlertLevel(alerts)
        },
        message: "Alerts fetched successfully"
    });
});

function calculateSeverity(count) {
    if (count >= 15) return "CRITICAL";
    if (count >= 10) return "HIGH"; 
    if (count >= 8) return "MODERATE";
    return "LOW";
}

function getOverallAlertLevel(alerts) {
    if (alerts.some(alert => alert.count >= 15)) return "CRITICAL";
    if (alerts.some(alert => alert.count >= 10)) return "HIGH";
    if (alerts.length > 0) return "MODERATE";
    return "LOW";
}

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