import { Router } from "express";

import {
  getPendingLikes,
  likeUser,
  loginUser,
  logoutUser,
  matches,
  registerUser,
  userProfile,
  validateToken,
} from "../controllers/user.controller.js";

const userRouter = Router();
userRouter.route("/register").post(registerUser);
userRouter.route("/login").post(loginUser);
userRouter.route("/logout").post(logoutUser);
userRouter.route("/matches").get(matches);
userRouter.route("/profile").get(userProfile);
userRouter.route("/like").post(likeUser);
userRouter.route("/pending-likes").get(getPendingLikes);

export default userRouter;
