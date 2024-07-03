const mongoose = require("mongoose");
const { userSchema, videoSchema } = require("./schemas");

const userModel = mongoose.model("User", userSchema);
const videoModel = mongoose.model("Video", videoSchema);

module.exports = { userModel, videoModel };
