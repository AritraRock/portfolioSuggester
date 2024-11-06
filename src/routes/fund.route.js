import { Router } from "express";
import { saveData } from "../controllers/fund.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/saveData").post(saveData)

export default router