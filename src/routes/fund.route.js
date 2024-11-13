import { Router } from "express";
import { saveData, getOptimizedPortfolio, saveHistData } from "../controllers/fund.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/saveData").post(saveData)
router.route("/saveHistData").post(saveHistData)
router.route("/getOptPortfolio").get(getOptimizedPortfolio)

export default router