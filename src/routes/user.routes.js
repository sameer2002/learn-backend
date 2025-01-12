import { Router } from "express";
import { accessToken, loginUser, logoutUser, registerUser, chnageCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory } from "../controllers/user.js";
import { upload } from "../middlewares/multer.js"
import { verifyToken } from "../middlewares/auth.js";

const router = Router();

router.post(
    '/register',
    upload.fields([
        { name: 'avatar', maxCount: 1 },
        { name: 'coverImage', maxCount: 1 },
    ]),
    registerUser
);
router.post(
    '/login',
    loginUser
);


//secured route
router.post('/logout', verifyToken, logoutUser);
router.post('/accessToken', accessToken);
router.post("/change-password", verifyToken, chnageCurrentPassword)
router.get("/current-user", verifyToken, getCurrentUser)
router.patch("/update-account", verifyToken, updateAccountDetails)
router.patch("/avatar", verifyToken, upload.single("avatar"), updateUserAvatar)
router.patch("/cover-image", verifyToken, upload.single("coverImage"), updateUserCoverImage)
router.get("/c/:username", verifyToken, getUserChannelProfile)
router.get("/history", verifyToken, getWatchHistory)


export default router;
