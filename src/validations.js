const { check } = require("express-validator");
const {
  count_num_of_words_in_text,
  validate_add_bio,
  validate_video_title,
  validate_video_description,
} = require("./utils");

const validateUserRegistration = [
  check("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .bail(),
  check("lastName")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .bail(),
  check("email").isEmail().withMessage("Invalid email address").bail(),
  check("phoneNumber")
    .isMobilePhone("en-IN")
    .withMessage("Mobile number should contain 10 digits.")
    .bail(),
];

const validateUserLogin = [
  check("email").trim().isEmail().withMessage("Invalid email address").bail(),
  check("password")
    .trim()
    .notEmpty()
    .withMessage("Password is required")
    .bail(),
];

const validateAddBio = [
  check("bio").custom(validate_add_bio).withMessage("Invalid bio length."),
];

const validateUploadVideo = [
  check("title")
    .custom(validate_video_title)
    .withMessage("Invalid video title")
    .bail(),
  check("description")
    .custom(validate_video_description)
    .withMessage("Invalid video description")
    .bail(),
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateAddBio,
  validateUploadVideo,
};
