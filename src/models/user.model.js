import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
    },
    phoneNumber: {
      type: String, // Changed to String to match the provided data
      required: true,
      unique: true,
    },
    dob: {
      type: Date,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    area: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      required: true,
      enum: [
        "Men",
        "Women",
        "Non-binary",
        "Transgender",
        "Prefer not to say",
        "Other",
      ],
    },
    datingIntension: {
      type: String,
      required: true,
    },
    datingPreferences: {
      type: String,
    },
    height: {
      selectedUnit: { type: String, enum: ["cm", "ft"] },
      cm: { type: Number },
      ft: { type: Number },
      inch: { type: Number },
    },
    religion: {
      type: String,
    },
    hometown: {
      type: String,
    },
    collegeInfo: {
      college: { type: String },
      course: { type: String },
      workPosition: { type: String },
    },
    drinkSmokeInfo: {
      drinkOption: { type: String },
      smokeOption: { type: String },
    },
    foodPreference: {
      type: String,
    },
    knownLanguages: {
      type: [String],
    },
    motherTongue: {
      type: String,
    },
    profileImage: {
      type: String,
    },
    userPhotos: [
      {
        type: String,
      },
    ],
    movie: [
      {
        title: String,
        backdrop_path: String,
        poster_path: String,
        id: Number,
      },
    ],
    selectedInterests: [
      {
        id: Number,
        name: String,
      },
    ],
    oneWord: {
      type: String,
    },
    bio: {
      type: String,
    },

    userPrompts: {
      type: Map,
      of: {
        prompt: { type: String },
        answer: { type: String },
      },
    },

    likedProfiles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    receivedLikes: [
      {
        userid: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        image: {
          type: String,
        },
        Comment: {
          type: String,
        },
      },
    ],
    matches: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

const userModel = mongoose.model("User", userSchema);
export default userModel;
