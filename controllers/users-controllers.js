const HttpError = require("../models/http-error");
const { validationResult } = require("express-validator");

const UserSchema = require("../models/user-schema");

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await UserSchema.find({}, "-password");
  } catch (err) {
    const error = new HttpError("Could not fetch users", 500);
    return next(error);
  }

  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Invalid inputs passed, check your data"));
  }
  const { name, email, password } = req.body;

  let userExist;
  try {
    userExist = await UserSchema.findOne({ email: email });
  } catch (err) {
    const error = new HttpError("Signing up failed.", 500);
    return next(error);
  }

  if (userExist) {
    const error = new HttpError("User exist already", 422);
    return next(error);
  }

  const createdUser = new UserSchema({
    name,
    email,
    image: req.file.path,
    password,
    places: [],
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError("Signing up failed", 500);
    return next(error);
  }

  res.status(201).json({ users: createdUser.toObject({ getters: true }) });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  let userExist;
  try {
    userExist = await UserSchema.findOne({ email: email });
  } catch (err) {
    const error = new HttpError("Loging in failed.", 500);
    return next(error);
  }

  if (!userExist || userExist.password !== password) {
    const error = new HttpError(
      "Could not log you in with this credentials",
      401
    );
    return next(error);
  }

  res.json({
    message: "Logged in",
    user: userExist.toObject({ getters: true }),
  });
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
