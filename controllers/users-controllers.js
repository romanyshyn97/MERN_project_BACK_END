const HttpError = require("../models/http-error");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError("Could not create user, please try again");
    return next(error);
  }

  const createdUser = new UserSchema({
    name,
    email,
    image: req.file.path,
    password: hashedPassword,
    places: [],
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError("Signing up failed", 500);
    return next(error);
  }

  let token;
  try {
    token = await jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      "supersecret_key_for_token",
      { expiresIn: "1h" }
    );
  } catch (err) {
    const error = new HttpError("Signing up failed", 500);
    return next(error);
  }

  res
    .status(201)
    .json({ userId: createdUser.id, email: createdUser.email, token: token });
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

  if (!userExist) {
    const error = new HttpError(
      "Could not log you in with this credentials",
      401
    );
    return next(error);
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, userExist.password);
  } catch (err) {
    const error = new HttpError(
      "Could not log you in, please check your credentials"
    );
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError("Invalid credentials");
    return next(error);
  }

  let token;
  try {
    token = await jwt.sign(
      { userId: userExist.id, email: userExist.email },
      "supersecret_key_for_token",
      { expiresIn: "1h" }
    );
  } catch (err) {
    const error = new HttpError("Loging in failed", 500);
    return next(error);
  }

  res.json({
    userId: userExist.id,
    email: userExist.email,
    token: token
  });
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
