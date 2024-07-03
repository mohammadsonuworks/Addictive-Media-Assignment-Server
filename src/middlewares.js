const { UNAUTHORIZED, FAILURE } = require("./status_codes");
const { verify_token } = require("./utils");

const is_user_logged_in = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).json({ code: 0, message: UNAUTHORIZED });
  }

  const providedToken = req.headers.authorization;
  const verifyTokenInfo = verify_token(providedToken);

  if (verifyTokenInfo.status === FAILURE) {
    return res.status(401).json({ code: 0, message: UNAUTHORIZED });
  }

  req.decodedPayload = verifyTokenInfo.decodedPayload;
  next();
};

module.exports = {
  is_user_logged_in,
};
