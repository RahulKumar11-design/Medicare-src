import mongoose,{Schema} from "mongoose";

const reportSchema = new Schema({
    disease:{
        type:String,
    },
    location:{
        type:String,
    },
    timestamps:{
        type:Date
    }
});

export const Report = mongoose.model("Report",reportSchema);