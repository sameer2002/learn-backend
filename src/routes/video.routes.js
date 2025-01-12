import { Router } from "express";
import { upload } from "../middlewares/multer.js"
import { verifyToken } from "../middlewares/auth.js";
import { getAllVideos, publishAVideo, getVideoById, updateVideo, deleteVideo, togglePublishStatus } from "../controllers/video.js"


const router = Router();

router.use(verifyToken);

router.post('/publishVideo', upload.fields([
    {
        name: "videoFile",
        maxCount: 1,
    },
    {
        name: "thumbnail",
        maxCount: 1,
    },

]),
    publishAVideo)
router.post('/list', getAllVideos)
router.get('/view', getVideoById)
router.put('/update', upload.single("thumbnail"), updateVideo)
router.delete('/delete', deleteVideo)
router.put('/togglePublishStatus', togglePublishStatus)


export default router
