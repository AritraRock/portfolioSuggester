import data from "../../data.json" assert { type: "json" };
import { Fund } from "../models/funds.models.js";
import mongoose from "mongoose";
import { ApiResponse } from "../utils/ApiResponse.js";

export const saveData = async (_,res) => {
    try {
        // Loop through each fund in dataTest
        for (const fundData of data) {
            let fund = {};

            // Loop through the fundData object
             // Initialize an object
    
                // Loop through the fundData object
                for (let key in fundData) {
                    if (typeof fundData[key] === 'object' && fundData[key] !== null) {
                        // If fundData[key] is an object (like sector_Allocation or holdings)
                        if (key === 'sector_Allocation' || key === 'holdings') {
                            // Use Object.entries and map to convert all values to numbers
                            fund[key] = Object.fromEntries(
                                Object.entries(fundData[key]).map(([subKey, value]) => [subKey, Number(value)])
                            );
                        } else {
                            // For other nested objects, handle similarly or skip
                            fund[key] = fundData[key];
                        }
                    } else {
                        // For non-object properties, directly assign the value
                        if (['expense_Ratio', 'portfolio_Turnover', 'one_Year_CAGR', 'three_Year_CAGR', 'five_Year_CAGR'].includes(key)) {
                            fund[key] = Number(fundData[key]); // Ensure numeric fields are saved as numbers
                        } else {
                            fund[key] = fundData[key]; // Otherwise, directly assign the value
                        }
                    }
                }
            // Perform the database operation
            await Fund.findOneAndUpdate(
                { fund_Name: fund.fund_Name }, // Find by fund name
                {
                    $set: {
                        amc_name: fund.amc_name,
                        fund_Name: fund.fund_Name,
                        total_Assets_Value: fund.total_Assets_Value,
                        expense_Ratio: fund.expense_Ratio,
                        portfolio_Turnover: fund.portfolio_Turnover,
                        inception_Date: fund.inception_Date,
                        asset_Type: fund.asset_Type,
                        cap_Type: fund.cap_Type,
                        risk_Level: fund.risk_Level,
                        one_Year_CAGR: fund.one_Year_CAGR,
                        three_Year_CAGR: fund.three_Year_CAGR,
                        five_Year_CAGR: fund.five_Year_CAGR,
                        sector_Allocation: fund.sector_Allocation,
                        holdings: fund.holdings
                    }
                },
                { upsert: true, new: true }
            );

            // console.log("\n", fund);
        }

        // console.log('All data saved successfully');
        return res.status(201).json(
            new ApiResponse(200,"All data saved successfully")
        ) 
    } catch (error) {
        console.error('Error saving data:', error);
    } finally {
        mongoose.connection.close();
    }
};
