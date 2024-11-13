import data from "../../data.json" assert { type: "json" };
import hisdata from "../../histData.json" assert { type: "json" };
import { Fund } from "../models/funds.models.js";
import { HistData } from "../models/historicalData.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import {max, min, pow, sqrt } from 'mathjs';
// import { mean, sampleCovariance } from 'simple-statistics';
import {sampleCovariance, variance} from "simple-statistics";

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
                // console.log("Fund created successfully!");            
            } 
            else {
                // Update the existing fund
                await Fund.findByIdAndUpdate(
                    existingFund._id,
                    { $set: fund },
                    { new: true }
                );
                // console.log("Fund updated successfully!");
            }

        }

        // Send success response after all data is saved
        return res.status(201).json(new ApiResponse(201,"All data saved successfully"));
    } catch (error) {
        console.error('Error saving data:', error);
        return res.status(500).json(new ApiError(500, "Error saving data"));
    }   
};

export const saveHistData = async (_, res) => {
    try {
        // Loop through each fund in data
        for (const fundData of hisdata) {
                
            const existingFund = await HistData.findOne({ fund_Name: fundData.fund_Name });

            if (!existingFund) {
                // Create a new fund since it doesn't exist
                await HistData.create(fundData);
                // console.log("History of Fund Data created successfully!");            
            } 
            else {
                // Update the existing fund
                await HistData.findByIdAndUpdate(
                    existingFund._id,
                    { $set: fundData },
                    { new: true }
                );
                // console.log("History of Fund Data updated successfully!");
            }

        }

        // Send success response after all data is saved
        return res.status(201).json(new ApiResponse(201,"All Hist data saved successfully"));
    } 
    catch (error) {
        console.error('Error saving data:', error);
        return res.status(500).json(new ApiError(500, "Error saving Hist data"));
    }
};

function zScoreNormalize(data) {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const stdDev = sqrt(data.reduce((sum, val) => sum + pow(val - mean, 2), 0) / data.length);
    return data.map(x => (x - mean) / stdDev);
}

export const getOptimizedPortfolio = async (req, res) => {
    console.log(req.query)
    const { amount, risk, assetType, limit } = req.query;

    if (!amount || !risk || !assetType || !limit) {
        throw new ApiError(400, `Missing required parameters ${amount} ${risk} ${assetType} ${limit}`);
    }

    try {
        // console.log("Request Data:", req.body);
        const topTwoFunds = await Fund.aggregate([
            {
              $match: {
                risk_Level: risk,
                asset_Type:assetType,
              }
            },
            {
              $sort: {
                five_Year_CAGR: -1 // Sort in descending order based on five_Year_CAGR
              }
            },
            {
              $limit: Number(limit) // Get the top 2 funds
            }
        ]);
        
        console.log("Aggregation Result:", topTwoFunds);


        if (topTwoFunds.length === 0) {
            throw new ApiError(401,"No funds found according to the arguments")
        }

        if (topTwoFunds.length === 1) {
            topTwoFunds[0].allocation=amount;
            return res.status(200).json(new ApiResponse(200,topTwoFunds, "Returning single optimized portfolio"));
        }
        
        const historicalDataOfFund1=await HistData.findOne({
                    fund_Name:topTwoFunds[0].fund_Name
                    // fund_Name:"Nippon India Income Fund"
        })
        const data1=zScoreNormalize(historicalDataOfFund1.historical_Data);
        // const data1=[
        //     0.02, 0.03, 0.01, 0.02,
        // ];
        // console.log(historicalDataOfFund1.historical_Data);
        const sigma1=variance(data1);
        // console.log(sigma1,historicalDataOfFund1.historical_Data.length);
        const historicalDataOfFund2=await HistData.findOne({
            fund_Name:topTwoFunds[1].fund_Name
            // fund_Name:"SBI Dynamic Bond Fund"
        })
        
        const data2=zScoreNormalize(historicalDataOfFund2.historical_Data);
        // const data2=[
        //     0.06, 0.04, 0.05, 0.03, 0.02, 0.04
        // ];

        // console.log(historicalDataOfFund2.historical_Data)
        const sigma2=variance(data2);
        // console.log(sigma2,historicalDataOfFund2.historical_Data.length);
        const minSize=min(data1.length,data2.length);

        const sigma12=sampleCovariance(
            data1.slice(0, minSize),
            data2.slice(0, minSize)
        );
        // console.log(sigma12);

        const w1 = max(0, min(1, (sigma2 - sigma12) / (sigma1 + sigma2 - 2 * sigma12)));

        console.log(w1);
        topTwoFunds[0].allocation=w1*amount;
        topTwoFunds[1].allocation=(1-w1)*amount;
        return res.status(200).json(new ApiResponse(200,topTwoFunds,"Portfolio optimized successfully"));
    } 
    catch (error) {
        throw new ApiError(500, `Error optimizing portfolio: ${error}`);
    }
    
};