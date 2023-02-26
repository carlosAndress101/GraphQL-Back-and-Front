import mongoose from "mongoose";

export const connecDB = async () => {
  try {
    mongoose.set("strictQuery", false);
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`Mongodb connect successfull: ${conn.connection.name}`);
  } catch {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};
