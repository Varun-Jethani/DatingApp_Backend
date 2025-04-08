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
        "men",
        "women",
        "Non-binary",
        "Transgender",
        "Prefer not to say",
        "Other",
      ],
    },
    datingIntension: {
      type: String,
      required: true,
      enum: [
        "Long Term Relationship",
        "Short Term Relationship",
        "Long Term but open to short",
        "Short Term but open to long",
        "Prefer not to say",
      ],
    },
    bio: {
      type: String,
    },
    foodPreference: {
      type: String,
      enum: [
        "Vegetarian",
        "Non-Vegetarian",
        "Vegan",
        "Jain",
        "Prefer not to say",
      ],
    },
    motherTongue: {
      type: String,
    },
    oneWord: {
      type: String,
    },
    height: {
      selectedUnit: { type: String, enum: ["cm", "ft"] },
      cm: { type: Number },
      ft: { type: Number },
      inch: { type: Number },
    },
    hometown: {
      type: String,
    },
    religion: {
      type: String,
    },
    collegeInfo: {
      college: { type: String },
      course: { type: String },
      workPosition: { type: String },
    },
    drinkSmokeInfo: {
      drinkOption: { type: String, enum: ["Yes", "No"] },
      smokeOption: { type: String, enum: ["Yes", "No"] },
    },
    datingPreferences: {
      type: String,
    },
    selectedInterests: {
      type: [String],
    },
    selectedMovies: {
      type: [Object], // To store movie objects
    },
    userPrompts: {
      type: Map,
      of: {
        prompt: { type: String },
        answer: { type: String },
      },
    },
    registrationData: {
      type: Map,
      of: {
        prompt: { type: String },
        answer: { type: String },
      },
    },
    knownLanguages: {
      type: [String],
    },
  },
  { timestamps: true }
);

const userModel = mongoose.model("User", userSchema);
export default userModel;
