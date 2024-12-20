import mongoose, {Schema} from "mongoose";

const fundSchema = new Schema(
    {
        amc_name:{
            type: String,
            required:true
        },
        fund_Name:{
            type: String,
            required:true
        },
        total_Assets_Value:{
            type: String,
            required:true
        },
        expense_Ratio:{
            type: Number,
            required:true
        },
        portfolio_Turnover:{
            type: Number,
            required:true
        },
        inception_Date:{
            type: String,
            required:true
        },
        asset_Type:{
            type: String,
            required:true
        },
        cap_Type:{
            type: String,
            required:true
        },
        risk_Level:{
            type: String,
            required:true
        },
        one_Year_CAGR:{
            type: Number,
            required:true
        },
        three_Year_CAGR:{
            type: Number,
            required:true
        },
        five_Year_CAGR:{
            type: Number,
            required:true
        },
        sector_Allocation:{
            // sector_name: { type: String, required: true },
            // allocation_percentage: { type: Number, required: true },
            type:Map,
            of:Number,
            required:true,
        },
        holdings:{
            // holder_name: { type: String, required: true },
            // holding_percentage: { type: Number, required: true },
            type:Map,
            of:Number,
            required:true,
        }
    },
    {timestamps:true}
);

export const Fund = mongoose.model("Fund",fundSchema)