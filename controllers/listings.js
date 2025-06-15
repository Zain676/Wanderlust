const Listing = require("../models/listing");
const axios = require("axios");
const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;

module.exports.index = async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index.ejs", { allListings });
};

module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id)
    .populate({ path: "reviews", populate: { path: "author" } })
    .populate("owner");
  if (!listing) {
    req.flash("error", "Listing does not exist");
    return res.redirect("/listings");
  }
  res.render("listings/show.ejs", {
    listing,
    apiKey: process.env.TOMTOM_API_KEY,
  });
};

module.exports.createListing = async (req, res, next) => {
  try {
    const geoResponse = await axios.get(
      `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(
        req.body.listing.city
      )}.json?key=${TOMTOM_API_KEY}`
    );

    const results = geoResponse.data.results;

    if (!results || results.length === 0 || !results[0].position) {
      req.flash("error", "City not found. Please enter a valid location.");
      return res.redirect("/listings/new");
    }

    const { lat, lon: lng } = results[0].position;

    let images = req.files.map((file) => ({
      url: file.path,
      filename: file.filename,
    }));

    const newListing = new Listing({
      ...req.body.listing,
      coordinates: { lat, lng },
      images,
      owner: req.user._id,
    });

    // Main image
    const mainImage = req.files["image"]?.[0];
    if (mainImage) {
      newListing.image = {
        url: mainImage.path,
        filename: mainImage.filename,
      };
    }

    // Additional images
    const additionalImages = req.files["images"] || [];
    newListing.images = additionalImages.map((file) => ({
      url: file.path,
      filename: file.filename,
    }));

    await newListing.save();
    req.flash("success", "New Listing Created");
    res.redirect("/listings");
  } catch (err) {
    if (err.name === "ValidationError") {
      req.flash("error", "Please select a valid category.");
      return res.redirect("/listings/new");
    }
    next(err);
  }
};

module.exports.renderEditForm = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing does not exist");
    return res.redirect("/listings");
  }
  let originalImageUrl = listing.image.url;
  originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");
  res.render("listings/edit.ejs", { listing, originalImageUrl });
};

module.exports.updateListing = async (req, res, next) => {
  try {
    let { id } = req.params;
    const existingListing = await Listing.findById(id);

    // 1. Handle geocoding if city changed
    if (
      req.body.listing.city &&
      req.body.listing.city !== existingListing.city
    ) {
      const geoResponse = await axios.get(
        `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(
          req.body.listing.city
        )}.json?key=${TOMTOM_API_KEY}`
      );

      if (!geoResponse.data.results || geoResponse.data.results.length === 0) {
        throw new Error("Invalid location");
      }

      req.body.listing.coordinates = {
        lat: geoResponse.data.results[0].position.lat,
        lng: geoResponse.data.results[0].position.lon,
      };
    } else {
      // Preserve existing coordinates if city didn't change
      req.body.listing.coordinates = existingListing.coordinates;
    }

    // 2. Preserve category if not provided (or validate if changed)
    if (!req.body.listing.category) {
      req.body.listing.category = existingListing.category;
    }

    // 3. Handle image update
    const updateData = { ...req.body.listing };
    if (req.file) {
      updateData.image = {
        url: req.file.path,
        filename: req.file.filename,
      };
    }

    await Listing.findByIdAndUpdate(id, updateData);

    req.flash("success", "Listing Updated");
    res.redirect(`/listings/${id}`);
  } catch (err) {
    if (err.message === "Invalid location") {
      req.flash("error", "Could not find coordinates for the specified city");
      return res.redirect(`/listings/${id}/edit`);
    }
    next(err);
  }
};

module.exports.destroyListing = async (req, res) => {
  let { id } = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id);
  req.flash("success", "Listing Deleted");
  res.redirect("/listings");
};

module.exports.filterByCategory = async (req, res) => {
  const { category } = req.params;
  const listings = await Listing.find({ category });
  res.json({ listings });
};
