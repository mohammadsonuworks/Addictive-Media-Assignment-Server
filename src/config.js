const UI_APP_URL = "https://addictive-assignment-ui-a895d1b0ef15.herokuapp.com";
const APP_LOGIN_URL = `${UI_APP_URL}/login`;
const REGISTRATION_COMPLETE_MAIL_SUBJECT = "Thank you for creating account.";
const REGISTRATION_COMPLETE_MAIL_BODY = `Hi __FULL_NAME__. Please click on ${APP_LOGIN_URL} and use this password to login : __PASSWORD__

Your account details are as follows:
First Name : __FIRST_NAME__
Last Name : __LAST_NAME__
Email : __EMAIL__
Phone Number : __PHONE_NUMBER__`;
const ADD_BIO_CONFIG = {
  MINIMUM_WORDS_COUNT: 1,
  MAXIMUM_WORDS_COUNT: 500,
};
const UPLOAD_VIDEO_CONFIG = {
  UPLOAD_LOCATION: "uploads/",
  MAX_FILE_SIZE_IN_MB: 6,
  ACCEPTED_FILE_TYPES: ["video/mp4"],
  TITLE_MIN_WORDS: 1,
  TITLE_MAX_WORDS: 30,
  DESCRIPTION_MIN_WORDS: 1,
  DESCRIPTION_MAX_WORDS: 120,
};

module.exports = {
  REGISTRATION_COMPLETE_MAIL_SUBJECT,
  REGISTRATION_COMPLETE_MAIL_BODY,
  UI_APP_URL,
  ADD_BIO_CONFIG,
  UPLOAD_VIDEO_CONFIG,
};
