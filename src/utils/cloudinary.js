import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";


cloudinary.config({
    cloud_name: process.env.CODINARY_NAME,
    api_key: process.env.CODINARY_API_KEY,
    api_secret: process.env.CODINARY_SECRET// Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async (locaclFilePath) => {
    try {
        if (!locaclFilePath) return null;
        //upload file

        const res = await cloudinary.uploader.upload(locaclFilePath, {
            resource_type: "auto",
        })

        //file uploaded sucessfully

        console.log("file is uploded sucessfuly", res.url)
        return res;
    } catch (error) {
        fs.unlinkSync(locaclFilePath) // remove the localy saved temp file

        return null;
    }
};
export { uploadOnCloudinary }