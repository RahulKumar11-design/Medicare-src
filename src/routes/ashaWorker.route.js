import { Router } from "express";

const router = Router();
//api/ashaWorkers/portal
router.route("/portal")
.get(async (req,res) => {
    return res.render('ashaWorker.ejs');
});

export default router;