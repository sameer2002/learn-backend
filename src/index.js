import dotenv from "dotenv"
import connectDB from "./db/index.js"
import { app } from "./app.js"


dotenv.config({
    path: "./env"
})





import express from "express"
// const app = express()

connectDB()
    .then(() => {
        const port = process.env.PORT || 8000
        app.listen(port, () => {
            console.log(`Server is running on port: ${port}`)
        })
    })
    .catch((err) => {
        console.error("Error connecting to MongoDB:", err)
        // process.exit(1)
    })





// import express from "express"
// const app = express()

//     ; (async () => {

//         try {
//             await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
//             app.on("error", (error) => {
//                 console.log("Error", error)
//             })

//             app.listen(process.env.PORT, () => {
//                 console.log("Server is running on port", process.env.PORT)
//             })
//         }
//         catch (error) {
//             console.log(error)
//         }
//     })()