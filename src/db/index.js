import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        // Construct the MongoDB URI
        const uri = `${process.env.MONGODB_URI}/${DB_NAME}`;

        // Connect to MongoDB
        const connectionInstance = await mongoose.connect(uri, {
            // Optional: Add custom options if needed
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
        });

        console.log(`MongoDB connected successfully: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1); // Exit process with failure
    }
};

export default connectDB;
