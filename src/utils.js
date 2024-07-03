const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const AWS = require("aws-sdk");
const multer = require("multer");
const fs = require("fs");
require("dotenv").config();
const { userModel: User, videoModel: Video } = require("./db/models");
const { SUCCESS, FAILURE } = require("./status_codes");
const { ADD_BIO_CONFIG, UPLOAD_VIDEO_CONFIG } = require("./config");

const mailTransporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_ID,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_VIDEO_CONFIG.UPLOAD_LOCATION);
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1];
    cb(null, `${file.fieldname}-${Date.now()}.${ext}`);
  },
});

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

const generate_token = (payload) => {
  return jwt.sign(
    {
      ...payload,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_TOKEN_EXPIRY.toString(),
    }
  );
};

const verify_token = (token) => {
  const returnVal = {
    status: FAILURE,
  };
  try {
    const decodedPayload = jwt.verify(token, process.env.JWT_SECRET);
    returnVal.status = SUCCESS;
    returnVal.decodedPayload = decodedPayload;
  } catch (err) {
    console.error("Error verifying token:", err);
    returnVal.status = FAILURE;
  }
  return returnVal;
};

const check_user_exists = async (email) => {
  const returnVal = {
    status: FAILURE,
  };
  try {
    const user = await User.findOne({ email });
    returnVal.status = SUCCESS;
    if (user) {
      returnVal.exists = true;
      returnVal.user = user;
    } else {
      returnVal.exists = false;
    }
  } catch (err) {
    console.error("Error checking user existence:", err);
    returnVal.status = FAILURE;
  }
  return returnVal;
};

const get_user_videos = async (userId) => {
  const returnVal = {
    status: FAILURE,
  };
  try {
    const videos = await Video.find({ uploadedBy: userId });
    returnVal.status = SUCCESS;
    returnVal.videos = videos;
  } catch (err) {
    console.error("Error in getting videos:", err);
    returnVal.status = FAILURE;
  }
  return returnVal;
};

const get_all_registered_users = async () => {
  const returnVal = {
    status: FAILURE,
  };
  try {
    const users = await User.find();
    returnVal.status = SUCCESS;
    returnVal.users = users;
  } catch (err) {
    console.error("Error in getting all registered users:", err);
    returnVal.status = FAILURE;
  }
  return returnVal;
};

const get_videos_by_user_id = async (userId, limit = 0) => {
  const returnVal = {
    status: FAILURE,
  };
  try {
    let videos;
    if (limit === 0) {
      videos = await Video.find({ uploadedBy: userId });
    } else {
      videos = await Video.find({ uploadedBy: userId }).limit(limit);
    }
    returnVal.status = SUCCESS;
    returnVal.videos = videos;
  } catch (err) {
    console.error("Error in getting videos by user id:", err);
    returnVal.status = FAILURE;
  }
  return returnVal;
};

const send_mail = async (to, subject, text) => {
  const returnVal = {
    status: FAILURE,
  };
  try {
    const mailOptions = {
      from: process.env.GMAIL_ID,
      to,
      subject,
      text,
    };
    const info = await mailTransporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
    returnVal.status = SUCCESS;
  } catch (err) {
    console.error("Error sending email:", err);
    returnVal.status = FAILURE;
  }
  return returnVal;
};

const hash_password = async (password) => {
  const returnVal = {
    status: FAILURE,
  };
  try {
    const saltRounds = parseInt(process.env.PASSWORD_HASH_SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    returnVal.status = SUCCESS;
    returnVal.hashedPassword = hashedPassword;
  } catch (err) {
    console.error("Error hashing password:", err);
    returnVal.status = FAILURE;
  }
  return returnVal;
};

const verify_password = async (password, hashedPassword) => {
  const returnVal = {
    status: FAILURE,
  };
  try {
    const isPasswordCorrect = await bcrypt.compare(password, hashedPassword);
    returnVal.status = SUCCESS;
    returnVal.isPasswordCorrect = isPasswordCorrect;
  } catch (err) {
    console.error("Error verifying password:", err);
    returnVal.status = FAILURE;
  }
  return returnVal;
};

const generate_password = (firstName, lastName, phoneNumber) => {
  const phoneString = phoneNumber.toString();

  const combinedArray = (firstName + lastName + phoneString).split("");
  const combinedArrayLength = combinedArray.length;

  for (let i = combinedArrayLength - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combinedArray[i], combinedArray[j]] = [combinedArray[j], combinedArray[i]];
  }

  const passwordLength = 12;

  let password = "";
  for (let i = 0; i < passwordLength; i++) {
    password += combinedArray[Math.floor(Math.random() * combinedArray.length)];
  }

  return password;
};

const create_user = async (
  firstName,
  lastName,
  email,
  phoneNumber,
  password
) => {
  const returnVal = {
    status: FAILURE,
  };
  try {
    const newUser = new User({
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
    });
    await newUser.save();
    console.log("User created successfully.");
    returnVal.status = SUCCESS;
  } catch (err) {
    console.log("Error saving user:", err);
    returnVal.status = FAILURE;
  }
  return returnVal;
};

const add_user_bio = async (email, bio) => {
  const returnVal = {
    status: FAILURE,
  };
  try {
    await User.updateOne({ email }, { $set: { bio } });
    returnVal.status = SUCCESS;
  } catch (err) {
    console.error("Error adding user bio:", err);
    returnVal.status = FAILURE;
  }
  return returnVal;
};

const save_video = async ({ title, description, videoUrl, userId }) => {
  const returnVal = {
    status: FAILURE,
  };
  try {
    const newVideo = new Video({
      title,
      description,
      videoUrl,
      uploadedBy: userId,
    });
    await newVideo.save();
    console.log("Video saved successfully");
    returnVal.status = SUCCESS;
  } catch (err) {
    console.error("Error saving video:", err);
    returnVal.status = FAILURE;
  }
  return returnVal;
};

const upload_video_to_s3 = async (userEmail, file) => {
  const returnVal = {
    status: FAILURE,
  };
  try {
    const fileStream = fs.createReadStream(file.path);
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: `${userEmail}/${file.filename}`,
      Body: fileStream,
    };
    const uploadResult = await s3.upload(uploadParams).promise();
    returnVal.status = SUCCESS;
    returnVal.data = uploadResult;
  } catch (err) {
    console.error("Error uploading video to S3:", err);
    returnVal.status = FAILURE;
  }
  return returnVal;
};

const count_num_of_words_in_text = (text) => {
  if (text === "") return 0;
  return text.split(" ").length;
};

const validate_add_bio = (bio) => {
  bio = bio.trim();
  const numOfWordsInBio = count_num_of_words_in_text(bio);
  return (
    numOfWordsInBio >= ADD_BIO_CONFIG.MINIMUM_WORDS_COUNT &&
    numOfWordsInBio <= ADD_BIO_CONFIG.MAXIMUM_WORDS_COUNT
  );
};

const validate_video_title = (title) => {
  title = title.trim();
  const numOfWordsInTitle = count_num_of_words_in_text(title);
  return (
    numOfWordsInTitle >= UPLOAD_VIDEO_CONFIG.TITLE_MIN_WORDS &&
    numOfWordsInTitle <= UPLOAD_VIDEO_CONFIG.TITLE_MAX_WORDS
  );
};

const validate_video_description = (description) => {
  description = description.trim();
  const numOfWordsInDescription = count_num_of_words_in_text(description);
  return (
    numOfWordsInDescription >= UPLOAD_VIDEO_CONFIG.DESCRIPTION_MIN_WORDS &&
    numOfWordsInDescription <= UPLOAD_VIDEO_CONFIG.DESCRIPTION_MAX_WORDS
  );
};

const remove_file_from_disk = (fileLocation) => {
  return new Promise((resolve, reject) => {
    fs.unlink(fileLocation, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

module.exports = {
  check_user_exists,
  hash_password,
  generate_password,
  create_user,
  send_mail,
  verify_password,
  generate_token,
  verify_token,
  count_num_of_words_in_text,
  validate_add_bio,
  add_user_bio,
  multerStorage,
  validate_video_title,
  validate_video_description,
  remove_file_from_disk,
  upload_video_to_s3,
  save_video,
  get_user_videos,
  get_all_registered_users,
  get_videos_by_user_id,
};
