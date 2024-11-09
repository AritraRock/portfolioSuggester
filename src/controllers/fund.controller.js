import data from "../../data.json" assert { type: "json" };
import { Fund } from "../models/funds.models.js";
import mongoose from "mongoose";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

export const saveData = async (_, res) => {
    try {
        // Loop through each fund in data
        for (const fundData of data) {
            const fund = {};

            // Loop through the fundData object
            for (const key in fundData) {
                if (typeof fundData[key] === 'object' && fundData[key] !== null) {
                    // If fundData[key] is an object (like sector_Allocation or holdings)
                    if (key === 'sector_Allocation' || key === 'holdings') {
                        // Convert all values to numbers
                        fund[key] = Object.fromEntries(
                            Object.entries(fundData[key]).map(([subKey, value]) => [subKey.replace(/\./g,' '), Number(value)])
                        );
                    } else {
                        // Handle other nested objects if necessary, otherwise assign as-is
                        fund[key] = fundData[key];
                    }
                } else {
                    // Assign values directly for non-object properties
                    if (['expense_Ratio', 'portfolio_Turnover', 'one_Year_CAGR', 'three_Year_CAGR', 'five_Year_CAGR'].includes(key)) {
                        fund[key] = Number(fundData[key]); // Convert numeric fields to numbers
                    } else {
                        fund[key] = fundData[key];
                    }
                }
            }
            
            const existingFund = await Fund.findOne({ fund_Name: fund.fund_Name });

            if (!existingFund) {
                // Create a new fund since it doesn't exist
                await Fund.create(fund);
                console.log("Fund created successfully!");            
            } 
            else {
                // Update the existing fund
                await Fund.findByIdAndUpdate(
                    existingFund._id,
                    { $set: fund },
                    { new: true }
                );
                console.log("Fund updated successfully!");
            }

        }

        // Send success response after all data is saved
        return res.status(201).json(new ApiResponse(201,"All data saved successfully"));
    } catch (error) {
        console.error('Error saving data:', error);
        return res.status(500).json(new ApiError(500, "Error saving data"));
    } finally {
        // Close the connection only if it’s open
        if (mongoose.connection.readyState === 1) {
            mongoose.connection.close();
        }
    }
};
