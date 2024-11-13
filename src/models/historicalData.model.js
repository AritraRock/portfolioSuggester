import mongoose, {Schema} from "mongoose";

const histDataSchema = new Schema(
    {
        fund_Name:{
            type: String,
            required:true
        },
        historical_Data: [{
            type: Number,
            required:true
        }]
    },
    {timestamps:true}
);


export const HistData = mongoose.model("HistData",histDataSchema)