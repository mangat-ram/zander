import dotenv from "dotenv";
import { connectDatabase } from "./database/connectDatabase.js";
import { app } from "./app.js";

dotenv.config({
  path: "./.env"
})

connectDatabase()
.then(() => {
  app.listen(process.env.PORT || 8000, () => {
    console.log(`Server is Listening on Port ${process.env.PORT}`);
  })
})
.catch((error) => {
  console.log("Mongo DB Connection Failed!!! ",error);
})