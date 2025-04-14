import asyncHandler from "../utils/asynchandler.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ApiResponse } from "../utils/apiresponse.js";
import userModel from "../models/user.model.js";
import mongoose from "mongoose";
// import upload from "../middlewares/multer.js";
// import { uploadToCloudinary } from "../utils/cloudinary.js";
// import crypto from "crypto";

const registerUser = asyncHandler(async (req, res) => {
  try {
    const { name, email, password, ...otherData } = req.body;
    if (!name || !email || !password) {
      res.status(400);
      throw new Error("Please fill all the fields");
    }

    const existedUser = await userModel.findOne({ email });
    if (existedUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = bcrypt.hashSync(password, 10); // Hash the password
    const newUser = new userModel({
      name,
      email,
      password: hashedPassword,
      ...otherData,
    });

    await newUser.save();
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET);

    res.status(200).json({
      success: true,
      token,
    });
  } catch (error) {
    console.log("Error creating user:", error);
    res.status(500).json({
      success: false,
      message: "Error creating user",
      error: error.message,
    });
  }
});

// Login User
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400);
    throw new Error("Please fill all the fields");
  }
  const userDoc = await userModel.findOne({ email });
  if (userDoc) {
    const pass = bcrypt.compareSync(password, userDoc.password);
    if (pass) {
      jwt.sign(
        { email: userDoc.email, id: userDoc._id, name: userDoc.name },
        process.env.JWT_SECRET,
        { expiresIn: "1d" },
        (err, token) => {
          if (err) throw err;
          res
            .cookie("token", token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production", // Set secure to true in production
              sameSite: "None", // Required for cross-site cookies
            })
            .json({ token, user: userDoc }); // Include token in response
        }
      );
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }
  }
});

// Logout User
const logoutUser = asyncHandler(async (req, res) => {
  res
    .clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
    })
    .json({
      message: "Logged out successfully",
    });
});

// User Profile
const userProfile = asyncHandler(async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(400).json({
        success: false,
        message: "Not authorized, token missing",
      });
    }

    const token = authHeader.split(" ")[1];
    // console.log(token);
    jwt.verify(token, process.env.JWT_SECRET, {}, async (err, userDoc) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: "Not authorized, token invalid",
          error: err.message,
        });
      }
      // console.log(userDoc);

      const user = await userModel.findById(userDoc.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      // console.log(user);

      res.json({ user });
    });
  } catch (e) {
    console.error("Server error:", e);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: e.message,
    });
  }
});

const validateToken = asyncHandler(async (req, res) => {
  const token =
    req.headers.authorization && req.headers.authorization.split(" ")[1]; // Get token from 'Authorization' header
  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized" });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, userDoc) => {
    if (err) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }

    const user = await userModel.findById(userDoc.id).select("-password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user });
  });
});

const matches = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.query; // Get userId from request parameters

    const user = await userModel.findById(userId); // Find user by ID and populate matches
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    let filter = {};

    if (user.gender == "Men") {
      filter.gender = "Women";
    } else if (user.gender == "Women") {
      filter.gender = "Men";
    }

    let query = {
      _id: { $ne: userId },
    };
    if (user.type) {
      filter.type = user.type;
    }
    const currentUser = await userModel
      .findById(userId)
      .populate("matches", "_id")
      .populate("likedProfiles", "_id");

    const friendsIds = (currentUser.matches || []).map((friend) => friend._id);
    const likedIds = (currentUser.likedProfiles || []).map(
      (crush) => crush._id
    );

    const matches = await userModel
      .find(filter)
      .where("_id")
      .nin([userId, ...friendsIds, ...likedIds]);

    return res.status(200).json({
      success: true,
      matches,
    });
  } catch (error) {
    console.log("Error fetching matches:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching matches",
      error: error.message,
    });
  }
});
const likeUser = asyncHandler(async (req, res) => {
  try {
    const { userId, likedUserId } = req.body;

    // Validate input
    if (!userId || !likedUserId) {
      return res.status(400).json({
        success: false,
        message: "Both userId and likedUserId are required",
      });
    }

    // Get both users
    const currentUser = await userModel.findById(userId);
    const likedUser = await userModel.findById(likedUserId);

    if (!currentUser || !likedUser) {
      return res.status(404).json({
        success: false,
        message: "One or both users not found",
      });
    }

    // Check if already liked
    if (
      currentUser.likedProfiles &&
      currentUser.likedProfiles.includes(likedUserId)
    ) {
      return res.status(400).json({
        success: false,
        message: "User already liked this profile",
      });
    }

    // Add likedUserId to current user's likedProfiles array
    if (!currentUser.likedProfiles) {
      currentUser.likedProfiles = [];
    }
    currentUser.likedProfiles.push(likedUserId);

    // NEW CODE: Add to receivedLikes of the liked user
    if (!likedUser.receivedLikes) {
      likedUser.receivedLikes = [];
    }

    // Create the receivedLike object with required fields
    const receivedLike = {
      userid: userId,
      // Use profile image or empty string
      Comment: req.body.comment || "", // Optional comment if provided
    };

    likedUser.receivedLikes.push(receivedLike);

    // Save both users
    await currentUser.save();
    await likedUser.save();

    // Check if this creates a match (if the liked user has already liked the current user)
    let isMatch = false;
    if (likedUser.likedProfiles && likedUser.likedProfiles.includes(userId)) {
      // It's a match! Add each user to the other's matches array
      if (!currentUser.matches) currentUser.matches = [];
      if (!likedUser.matches) likedUser.matches = [];

      currentUser.matches.push(likedUserId);
      likedUser.matches.push(userId);

      await currentUser.save();
      await likedUser.save();

      isMatch = true;
    }

    res.status(200).json({
      success: true,
      message: isMatch ? "It's a match!" : "Profile liked successfully",
      isMatch,
    });
  } catch (error) {
    console.error("Error in likeUser:", error);
    res.status(500).json({
      success: false,
      message: "Error processing like action",
      error: error.message,
    });
  }
});

const getPendingLikes = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Get user with populated data
    const user = await userModel
      .findById(userId)
      .populate("likedProfiles", "name ")
      .populate("receivedLikes.userid", "name");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      likedProfiles: user.likedProfiles || [],
      receivedLikes: user.receivedLikes || [],
    });
  } catch (error) {
    console.error("Error fetching pending likes:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching pending likes",
      error: error.message,
    });
  }
});

/**
 * Handle when a user rejects another user
 * - Add rejected user to rejectList to avoid showing them again
 */
const rejectUser = asyncHandler(async (req, res) => {
  try {
    const { userId, rejectedUserId } = req.body;

    // Validate input
    if (!userId || !rejectedUserId) {
      return res.status(400).json({
        success: false,
        message: "Both userId and rejectedUserId are required",
      });
    }

    // Get current user
    const currentUser = await userModel.findById(userId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Add rejectedUserId to current user's rejectedProfiles array (if it exists)
    if (!currentUser.rejectedProfiles) {
      currentUser.rejectedProfiles = [];
    }

    // Check if already rejected
    if (currentUser.rejectedProfiles.includes(rejectedUserId)) {
      return res.status(400).json({
        success: false,
        message: "User already rejected this profile",
      });
    }

    currentUser.rejectedProfiles.push(rejectedUserId);
    await currentUser.save();

    res.status(200).json({
      success: true,
      message: "Profile rejected successfully",
    });
  } catch (error) {
    console.error("Error in rejectUser:", error);
    res.status(500).json({
      success: false,
      message: "Error processing reject action",
      error: error.message,
    });
  }
});

/**
 * Get all matches for a user
 * Returns the list of users that have mutually matched with the current user
 */
const getUserMatches = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Find user by ID and populate matches with full user details
    const user = await userModel
      .findById(userId)
      .populate(
        "matches",
        "name dob city oneWord userPhotos bio datingIntension selectedInterests"
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      matches: user.matches || [],
    });
  } catch (error) {
    console.error("Error fetching user matches:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching matches",
      error: error.message,
    });
  }
});
export {
  logoutUser,
  loginUser,
  userProfile,
  registerUser,
  validateToken,
  matches,
  getUserMatches,
  rejectUser,
  likeUser,
  getPendingLikes,
};
