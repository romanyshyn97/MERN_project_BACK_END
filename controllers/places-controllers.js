const fs = require('fs');

const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../models/http-error");
const getCoordsForAddress = require("../util/location");
const PlaceSchema = require("../models/place-schema");
const UserSchema = require("../models/user-schema");


const getPlaceById = async (req, res, next) => {
  const placeId = req.params.placeId;

  let place;
  try {
    place = await PlaceSchema.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a place",
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError("Could not find place for this id", 404);
    return next(error);
  }

  res.json({ place: place.toObject({ getters: true }) });
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let places;
  try {
    places = await PlaceSchema.find({ creator: userId });
  } catch (err) {
    const error = new HttpError("Fetching places failed", 500);
    return next(error);
  }

  if (!places || places.length === 0) {
    return next(new HttpError("Could not find places for this userId", 404));
  }

  res.json({
    places: places.map((place) => place.toObject({ getters: true })),
  });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    next(new HttpError("Invalid inputs passed, check your data"));
  }

  const { title, description, address, creator } = req.body;

  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }

  const createdPlace = new PlaceSchema({
    title,
    description,
    address,
    location: coordinates,
    image: req.file.path,
    creator
  });

  let userExist;
  try {
    userExist = await UserSchema.findById(creator);
  } catch (err) {
    const error = new HttpError("Creating place failed", 500);
    return next(error);
  }

  if (!userExist) {
    const error = new HttpError("Could not find user for provided id", 404);
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    userExist.places.push(createdPlace);
    await userExist.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError("Creating place failed", 500);
    return next(error);
  }

  res.status(201).json({ place: createdPlace });
};



const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new HttpError("Invalid inputs passed, check your data");
  }

  const { title, description } = req.body;
  const placeId = req.params.placeId;

  let place;
  try {
    place = await PlaceSchema.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update place",
      500
    );
    return next(error);
  }

  place.title = title;
  place.description = description;

  try {
    await place.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update place",
      500
    );
    return next(error);
  }

  res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.placeId;

  let place;
  try {
    place = await PlaceSchema.findById(placeId).populate('creator');
  } catch (err) {
    const error = new HttpError("Could not delete a place", 500);
    return next(error);
  }

  if(!place){
    const error = new HttpError('Could not find place for this id', 404);
    return next(error);
  }

  const imagePath = place.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.remove({session: sess});
    place.creator.places.pull(place);
    await place.creator.save({session: sess});
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError("Could not delete a place", 500);
    return next(error);
  }

  fs.unlink(imagePath, err => console.log(err));

  res.status(200).json({ message: "Deleted place" });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
