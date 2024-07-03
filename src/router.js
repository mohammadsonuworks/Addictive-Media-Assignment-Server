const express = require("express");
const router = express.Router();
const { validationResult } = require("express-validator");
const {
  validateUserRegistration,
  validateUserLogin,
  validateAddBio,
  validateUploadVideo,
} = require("./validations");
const {
  REGISTRATION_COMPLETE_MAIL_BODY,
  REGISTRATION_COMPLETE_MAIL_SUBJECT,
  UPLOAD_VIDEO_CONFIG,
} = require("./config");
const {
  check_user_exists,
  hash_password,
  generate_password,
  create_user,
  send_mail,
  verify_password,
  generate_token,
  add_user_bio,
  multerStorage,
  remove_file_from_disk,
  upload_video_to_s3,
  save_video,
  get_user_videos,
  get_all_registered_users,
  get_videos_by_user_id,
} = require("./utils");
const {
  UNEXPECTED_ERROR,
  FAILURE,
  USER_ALREADY_EXISTS,
  USER_REGISTRATION_SUCCESSFUL,
  USER_NOT_FOUND,
  INCORRECT_PASSWORD,
  VALIDATION_ERROR,
  LOGIN_SUCCESSFUL,
  USER_FETCH_SUCCESSFUL,
  BIO_ADDED,
  VIDEO_FILE_MISSING,
  INVALID_FILE_TYPE,
  FILE_SIZE_EXCEEDED,
  VIDEO_UPLOADED,
  VIDEOS_FETCH_SUCCESSFUL,
  USERS_FETCH_SUCCESSFUL,
} = require("./status_codes");
const { is_user_logged_in } = require("./middlewares");
const multer = require("multer");

const multerUpload = multer({ storage: multerStorage });

router.post("/register", validateUserRegistration, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ code: 0, message: VALIDATION_ERROR, errors: errors.array() });
  }

  const firstName = req.body.firstName.trim();
  const lastName = req.body.lastName.trim();
  const email = req.body.email.trim();
  const phoneNumber = req.body.phoneNumber.trim();

  const userState = await check_user_exists(email);
  if (userState.status === FAILURE) {
    return res.status(500).json({ code: 0, message: UNEXPECTED_ERROR });
  }
  if (userState.exists) {
    return res.status(409).json({ code: 0, message: USER_ALREADY_EXISTS });
  }

  console.log("Starting registration process ...");

  const randomPassword = generate_password(firstName, lastName, phoneNumber);
  const passwordInfo = await hash_password(randomPassword);
  if (passwordInfo.status === FAILURE) {
    return res.status(500).json({ code: 0, message: UNEXPECTED_ERROR });
  }

  const { hashedPassword } = passwordInfo;

  const createUserInfo = await create_user(
    firstName,
    lastName,
    email,
    phoneNumber,
    hashedPassword
  );
  if (createUserInfo.status === FAILURE) {
    return res.status(500).json({ code: 0, message: UNEXPECTED_ERROR });
  }

  const fullName = `${firstName} ${lastName}`;
  const mailSubject = REGISTRATION_COMPLETE_MAIL_SUBJECT;
  const mailBody = REGISTRATION_COMPLETE_MAIL_BODY.replace(
    "__FULL_NAME__",
    fullName
  )
    .replace("__PASSWORD__", randomPassword)
    .replace("__FIRST_NAME__", firstName)
    .replace("__LAST_NAME__", lastName)
    .replace("__EMAIL__", email)
    .replace("__PHONE_NUMBER__", phoneNumber);

  const sendMailInfo = await send_mail(email, mailSubject, mailBody);

  if (sendMailInfo.status === FAILURE) {
    return res.status(500).json({ code: 0, message: UNEXPECTED_ERROR });
  }

  return res.status(201).json({
    code: 1,
    message: USER_REGISTRATION_SUCCESSFUL,
  });
});

router.post("/login", validateUserLogin, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ code: 0, message: VALIDATION_ERROR, errors: errors.array() });
  }

  const email = req.body.email.trim();
  const password = req.body.password.trim();

  const userState = await check_user_exists(email);
  if (userState.status === FAILURE) {
    return res.status(500).json({ code: 0, message: UNEXPECTED_ERROR });
  }
  if (userState.exists === false) {
    return res.status(404).json({ code: 0, message: USER_NOT_FOUND });
  }

  const { user: userMetadata } = userState;

  const verifyPasswordInfo = await verify_password(
    password,
    userMetadata.password
  );
  if (verifyPasswordInfo.status === FAILURE) {
    return res.status(500).json({ code: 0, message: UNEXPECTED_ERROR });
  }
  if (verifyPasswordInfo.isPasswordCorrect === false) {
    return res.status(401).json({ code: 0, message: INCORRECT_PASSWORD });
  }

  console.log(
    `Correct credentials provided for ${email}. Starting login process ...`
  );

  const jwtToken = generate_token({ email, id: userMetadata._id });
  console.log("Generated token successfully");

  return res.status(200).json({
    code: 1,
    message: LOGIN_SUCCESSFUL,
    token: jwtToken,
  });
});

router.get("/user-metadata", is_user_logged_in, async (req, res) => {
  const userState = await check_user_exists(req.decodedPayload.email);
  if (userState.status === FAILURE) {
    return res.status(500).json({ code: 0, message: UNEXPECTED_ERROR });
  }

  const { firstName, lastName, email, phoneNumber, bio } = userState.user;
  return res.status(200).json({
    code: 1,
    message: USER_FETCH_SUCCESSFUL,
    data: {
      firstName,
      lastName,
      email,
      phoneNumber,
      bio,
    },
  });
});

router.get("/user-videos", is_user_logged_in, async (req, res) => {
  const userId = req.decodedPayload.id;
  const videosInfo = await get_user_videos(userId);
  if (videosInfo.status === FAILURE) {
    return res.status(500).json({ code: 0, message: UNEXPECTED_ERROR });
  }

  return res.status(200).json({
    code: 1,
    message: VIDEOS_FETCH_SUCCESSFUL,
    data: {
      videos: videosInfo.videos,
    },
  });
});

router.post("/bio", is_user_logged_in, validateAddBio, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ code: 0, message: VALIDATION_ERROR, errors: errors.array() });
  }

  const userEmail = req.decodedPayload.email;
  const bio = req.body.bio.trim();

  const addBioInfo = await add_user_bio(userEmail, bio);
  if (addBioInfo.status === FAILURE) {
    return res.status(500).json({ code: 0, message: UNEXPECTED_ERROR });
  }

  console.log("Bio added successfully");
  return res.status(200).json({
    code: 1,
    message: BIO_ADDED,
  });
});

router.post(
  "/upload-video",
  is_user_logged_in,
  multerUpload.single("video"),
  async (req, res) => {
    const userEmail = req.decodedPayload.email;
    const userId = req.decodedPayload.id;
    const videoFile = req.file;
    const title = req.body.title.trim();
    const description = req.body.description.trim();

    if (!videoFile) {
      return res.status(400).json({ code: 0, message: VIDEO_FILE_MISSING });
    }
    const fileType = videoFile.mimetype;
    const fileSizeInBytes = videoFile.size;

    const isFileTypeValid =
      UPLOAD_VIDEO_CONFIG.ACCEPTED_FILE_TYPES.includes(fileType);
    if (isFileTypeValid === false) {
      await remove_file_from_disk(videoFile.path);
      return res.status(400).json({ code: 0, message: INVALID_FILE_TYPE });
    }
    const maxAllowedFileSizeInBytes =
      UPLOAD_VIDEO_CONFIG.MAX_FILE_SIZE_IN_MB * 1024 * 1024;
    if (fileSizeInBytes > maxAllowedFileSizeInBytes) {
      await remove_file_from_disk(videoFile.path);
      return res.status(400).json({ code: 0, message: FILE_SIZE_EXCEEDED });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await remove_file_from_disk(videoFile.path);
      return res
        .status(400)
        .json({ code: 0, message: VALIDATION_ERROR, errors: errors.array() });
    }

    console.log("Valid request. Starting upload to S3 ...");

    const uploadInfo = await upload_video_to_s3(userEmail, videoFile);
    if (uploadInfo.status === FAILURE) {
      await remove_file_from_disk(videoFile.path);
      return res.status(500).json({ code: 0, message: UNEXPECTED_ERROR });
    }

    console.log("Video uploaded successfully");

    await remove_file_from_disk(videoFile.path);
    console.log("Removed video file from disk successfully");

    const videoUrl = uploadInfo.data.Location;

    const saveVideoInfo = await save_video({
      title,
      description,
      videoUrl,
      userId,
    });
    if (saveVideoInfo.status === FAILURE) {
      return res.status(500).json({ code: 0, message: UNEXPECTED_ERROR });
    }

    console.log("Video metadata saved successfully");
    return res.status(200).json({
      code: 1,
      message: VIDEO_UPLOADED,
      data: {
        videoUrl,
        title,
        description,
      },
    });
  }
);

// Listing page APIs below

router.get("/registered-users", is_user_logged_in, async (req, res) => {
  const registeredUsersInfo = await get_all_registered_users();
  if (registeredUsersInfo.status === FAILURE) {
    return res.status(500).json({ code: 0, message: UNEXPECTED_ERROR });
  }

  return res.status(200).json({
    code: 1,
    message: USERS_FETCH_SUCCESSFUL,
    data: {
      users: registeredUsersInfo.users,
    },
  });
});

router.get("/listing-videos", is_user_logged_in, async (req, res) => {
  const userId = req.query?.userId;
  const limit = req.query && req.query.limit && parseInt(req.query.limit);

  if (!userId) {
    return res.status(400).json({ code: 0, message: VALIDATION_ERROR });
  }

  const videosInfo = await get_videos_by_user_id(userId, limit || 0);
  if (videosInfo.status === FAILURE) {
    return res.status(500).json({ code: 0, message: UNEXPECTED_ERROR });
  }

  return res.status(200).json({
    code: 1,
    message: VIDEOS_FETCH_SUCCESSFUL,
    data: {
      videos: videosInfo.videos,
    },
  });
});

module.exports = { router };
