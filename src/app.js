import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors"

const app= express()

app.use(cors({
    origin:"http://localhost:3000",
    credentials:true
}))

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true, limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

import userRouter from "./routes/user.route.js"
import fundRouter from "./routes/fund.route.js"

app.use("/api/v1/users",userRouter)
app.use("/api/v1/funds",fundRouter)

export {app}