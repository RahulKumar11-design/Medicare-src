import { Router } from "express";
import { 
    getAlerts
} from "../controllers/outbreak.controller.js";

const router = Router();

router.route("/:location")
.get(getAlerts);

export default router;