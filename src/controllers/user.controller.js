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

      const user = await userModel.findById(userDoc.userId || userDoc.id);
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
      return res.status(200).json({
        success: true,
        message: "User already liked this profile",
      });
    }

    // Add likedUserId to current user's likedProfiles array
    if (!currentUser.likedProfiles) currentUser.likedProfiles = [];
    currentUser.likedProfiles.push(new mongoose.Types.ObjectId(likedUserId));

    // Create the receivedLike object with required fields
    const receivedLike = {
      userid: new mongoose.Types.ObjectId(userId),
      Comment: req.body.comment || "",
    };

    if (!likedUser.receivedLikes) likedUser.receivedLikes = [];
    likedUser.receivedLikes.push(receivedLike);

    // Check if this creates a match (if the liked user has already liked the current user)
    let isMatch = false;
    if (likedUser.likedProfiles && likedUser.likedProfiles.includes(userId)) {
      // It's a match! Add each user to the other's matches array
      if (!currentUser.matches) currentUser.matches = [];
      if (!likedUser.matches) likedUser.matches = [];

      // Only add to matches if not already there
      if (!currentUser.matches.includes(likedUserId)) {
        currentUser.matches.push(new mongoose.Types.ObjectId(likedUserId));
      }

      if (!likedUser.matches.includes(userId)) {
        likedUser.matches.push(new mongoose.Types.ObjectId(userId));
      }

      // Remove from receivedLikes once matched
      if (likedUser.receivedLikes) {
        likedUser.receivedLikes = likedUser.receivedLikes.filter(
          (like) => !like.userid.equals(userId)
        );
      }

      if (currentUser.receivedLikes) {
        currentUser.receivedLikes = currentUser.receivedLikes.filter(
          (like) => !like.userid.equals(likedUserId)
        );
      }

      isMatch = true;
    }

    // Save both users
    await currentUser.save();
    await likedUser.save();

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
      .populate("likedProfiles", "name")
      .populate("receivedLikes.userid", "name userPhotos");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
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

const getOtherProfiles = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.query; // User ID to fetch details for

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Fetch the user details by ID
    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user profile",
      error: error.message,
    });
  }
});

/**
 * Get mutual matches for a user
 * Only returns users where both parties have liked each other
 */
const getMutualMatches = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Find user and populate their matches with relevant profile data
    const user = await userModel
      .findById(userId)
      .populate(
        "matches",
        "name dob oneWord userPhotos bio occupation location interests"
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Filter to include only mutual matches (where both users have liked each other)
    const mutualMatches = [];

    // Go through each match and verify it's mutual
    for (const match of user.matches || []) {
      // Find the potential match's profile
      const matchUser = await userModel.findById(match._id);

      // Check if the match also has the current user in their matches array
      if (
        matchUser &&
        matchUser.matches &&
        matchUser.matches.includes(userId)
      ) {
        mutualMatches.push(match);
      }
    }

    res.status(200).json({
      success: true,
      matches: mutualMatches,
    });
  } catch (error) {
    console.error("Error fetching mutual matches:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching mutual matches",
      error: error.message,
    });
  }
});

/**
 * Create a match between two users when they both like each other
 */
const createMatch = asyncHandler(async (req, res) => {
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

    // Add liked user to current user's likedProfiles if not already there
    if (!currentUser.likedProfiles) {
      currentUser.likedProfiles = [];
    }

    if (!currentUser.likedProfiles.includes(likedUserId)) {
      currentUser.likedProfiles.push(new mongoose.Types.ObjectId(likedUserId));
    }

    // Check if this creates a match (if the liked user has already liked the current user)
    let isMatch = false;
    if (likedUser.likedProfiles && likedUser.likedProfiles.includes(userId)) {
      // It's a match! Add each user to the other's matches array
      if (!currentUser.matches) currentUser.matches = [];
      if (!likedUser.matches) likedUser.matches = [];

      // Only add to matches if not already there
      if (!currentUser.matches.includes(likedUserId)) {
        currentUser.matches.push(new mongoose.Types.ObjectId(likedUserId));
      }

      if (!likedUser.matches.includes(userId)) {
        likedUser.matches.push(new mongoose.Types.ObjectId(userId));
      }

      // Remove from receivedLikes once matched
      if (likedUser.receivedLikes) {
        likedUser.receivedLikes = likedUser.receivedLikes.filter(
          (like) => !like.userid.equals(userId)
        );
      }

      if (currentUser.receivedLikes) {
        currentUser.receivedLikes = currentUser.receivedLikes.filter(
          (like) => !like.userid.equals(likedUserId)
        );
      }

      isMatch = true;
    } else {
      // Not a match yet - add current user to liked user's receivedLikes
      if (!likedUser.receivedLikes) {
        likedUser.receivedLikes = [];
      }

      // Create the receivedLike object with required fields
      const receivedLike = {
        userid: new mongoose.Types.ObjectId(userId),
        Comment: req.body.comment || "",
      };

      // Check if this user already sent a like
      const existingLikeIndex = likedUser.receivedLikes.findIndex(
        (like) => like.userid.toString() === userId.toString()
      );

      if (existingLikeIndex === -1) {
        // Add the new like
        likedUser.receivedLikes.push(receivedLike);
      }
    }

    // Save both users
    await currentUser.save();
    await likedUser.save();

    res.status(200).json({
      success: true,
      message: isMatch ? "It's a match!" : "Profile liked successfully",
      isMatch,
    });
  } catch (error) {
    console.error("Error in createMatch:", error);
    res.status(500).json({
      success: false,
      message: "Error processing match action",
      error: error.message,
    });
  }
});

/**
 * Remove a match between two users
 */
const removeMatch = asyncHandler(async (req, res) => {
  try {
    const { userId, matchUserId } = req.body;

    // Validate input
    if (!userId || !matchUserId) {
      return res.status(400).json({
        success: false,
        message: "Both userId and matchUserId are required",
      });
    }

    // Get both users
    const currentUser = await userModel.findById(userId);
    const matchUser = await userModel.findById(matchUserId);

    if (!currentUser || !matchUser) {
      return res.status(404).json({
        success: false,
        message: "One or both users not found",
      });
    }

    // Remove from matches array
    if (currentUser.matches) {
      currentUser.matches = currentUser.matches.filter(
        (id) => id.toString() !== matchUserId.toString()
      );
    }

    if (matchUser.matches) {
      matchUser.matches = matchUser.matches.filter(
        (id) => id.toString() !== userId.toString()
      );
    }

    // Add to rejectedProfiles to prevent showing again
    if (!currentUser.rejectedProfiles) {
      currentUser.rejectedProfiles = [];
    }

    if (!currentUser.rejectedProfiles.includes(matchUserId)) {
      currentUser.rejectedProfiles.push(
        new mongoose.Types.ObjectId(matchUserId)
      );
    }

    // Save both users
    await currentUser.save();
    await matchUser.save();

    res.status(200).json({
      success: true,
      message: "Match removed successfully",
    });
  } catch (error) {
    console.error("Error in removeMatch:", error);
    res.status(500).json({
      success: false,
      message: "Error removing match",
      error: error.message,
    });
  }
});

/**
 * Get potential matches for a user (filtered by preferences but excluding already liked/rejected profiles)
 */
const getPotentialMatches = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Set up gender filter based on user preferences
    let filter = {};
    if (user.gender === "Men") {
      filter.gender = "Women";
    } else if (user.gender === "Women") {
      filter.gender = "Men";
    }

    // Apply additional filters based on user preferences
    if (user.type) {
      filter.type = user.type;
    }

    // Get user's already liked, rejected, and matched profiles
    const currentUser = await userModel
      .findById(userId)
      .populate("matches", "_id")
      .populate("likedProfiles", "_id")
      .populate("rejectedProfiles", "_id");

    const matchesIds = (currentUser.matches || []).map((match) => match._id);
    const likedIds = (currentUser.likedProfiles || []).map(
      (profile) => profile._id
    );
    const rejectedIds = (currentUser.rejectedProfiles || []).map(
      (profile) => profile._id
    );

    // Combine all IDs to exclude
    const excludeIds = [userId, ...matchesIds, ...likedIds, ...rejectedIds];

    // Find potential matches that meet criteria and exclude already interacted profiles
    const potentialMatches = await userModel
      .find(filter)
      .where("_id")
      .nin(excludeIds)
      .select("name dob oneWord userPhotos bio occupation location interests");

    return res.status(200).json({
      success: true,
      potentialMatches,
    });
  } catch (error) {
    console.error("Error fetching potential matches:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching potential matches",
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
  getOtherProfiles, // Add the new function to exports
  getMutualMatches,
  createMatch,
  removeMatch,
  getPotentialMatches,
};
