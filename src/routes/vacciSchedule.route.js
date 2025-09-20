import { Router } from "express";
import { 
    getAlerts
} from "../controllers/outbreak.controller.js";

const router = Router();
// api/vacciSchedule/dashboard
router.route("/dashboard")
.get(async (req,res) => res.render('vacciSchedule.ejs'))

export default router;