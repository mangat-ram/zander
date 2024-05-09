import mongoose from "mongoose";
import { DATABASE_NAME } from "../constant.js";

const connectDatabase = async () => {
  try {
    const instance = await mongoose.connect(`${process.env.MONGODB_URI}/${DATABASE_NAME}`);
    console.log(`\n MongoDB Connected Succesfully !! HOST:${instance.connection.host}`);
    
  } catch (error) {
    console.log("Connection Failed!!! due to error: ",error);
    process.exit(1)
  }
}

export { connectDatabase };