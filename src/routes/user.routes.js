import { Router } from "express";

import {
  createMatch,
  getMutualMatches,
  getOtherProfiles,
  getPendingLikes,
  likeUser,
  loginUser,
  logoutUser,
  matches,
  registerUser,
  rejectUser,
  removeMatch,
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
userRouter.route("/getotherprofile").get(getOtherProfiles);
userRouter.route("/mutual-matches").get(getMutualMatches);
userRouter.route("/create-match").post(createMatch);
userRouter.route("/remove-match").post(removeMatch);
userRouter.route("/reject").post(rejectUser);

export default userRouter;
