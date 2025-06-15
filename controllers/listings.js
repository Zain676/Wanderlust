const Listing = require("../models/listing");
const axios = require("axios");
const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;

// Show all listings
module.exports.index = async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index.ejs", { allListings });
};

// Render New Listing Form
module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};

// Show Single Listing
module.exports.showListing = async (req, res) => {
  const { id } = req.params;
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

// Create New Listing
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

    const newListing = new Listing({
      ...req.body.listing,
      coordinates: { lat, lng },
      owner: req.user._id,
    });

    // Main image
    if (req.files["image"]) {
      newListing.image = {
        url: req.files["image"][0].path,
        filename: req.files["image"][0].filename,
      };
    }

    // Additional images
    if (req.files["images"]) {
      newListing.images = req.files["images"].map((file) => ({
        url: file.path,
        filename: file.filename,
      }));
    }

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

// Render Edit Listing Form
module.exports.renderEditForm = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing does not exist");
    return res.redirect("/listings");
  }
  let originalImageUrl = listing.image?.url || "";
  originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");
  res.render("listings/edit.ejs", { listing, originalImageUrl });
};

// Update Listing
module.exports.updateListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existingListing = await Listing.findById(id);

    // Geocode if city is changed
    if (
      req.body.listing.city &&
      req.body.listing.city !== existingListing.city
    ) {
      const geoResponse = await axios.get(
        `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(
          req.body.listing.city
        )}.json?key=${TOMTOM_API_KEY}`
      );

      const result = geoResponse.data.results[0];
      if (!result) throw new Error("Invalid location");

      req.body.listing.coordinates = {
        lat: result.position.lat,
        lng: result.position.lon,
      };
    } else {
      req.body.listing.coordinates = existingListing.coordinates;
    }

    if (!req.body.listing.category) {
      req.body.listing.category = existingListing.category;
    }

    // Update listing
    const updatedListing = await Listing.findByIdAndUpdate(
      id,
      req.body.listing,
      { new: true }
    );

    // Replace main image if new one uploaded
    if (req.files["image"]) {
      updatedListing.image = {
        url: req.files["image"][0].path,
        filename: req.files["image"][0].filename,
      };
    }

    // Add new additional images
    if (req.files["images"]) {
      const newImages = req.files["images"].map((file) => ({
        url: file.path,
        filename: file.filename,
      }));
      updatedListing.images.push(...newImages);
    }

    await updatedListing.save();

    req.flash("success", "Listing Updated");
    res.redirect(`/listings/${id}`);
  } catch (err) {
    if (err.message === "Invalid location") {
      req.flash("error", "Could not find coordinates for the specified city");
      return res.redirect(`/listings/${req.params.id}/edit`);
    }
    next(err);
  }
};

// Delete Listing
module.exports.destroyListing = async (req, res) => {
  const { id } = req.params;
  await Listing.findByIdAndDelete(id);
  req.flash("success", "Listing Deleted");
  res.redirect("/listings");
};

// Filter by Category
module.exports.filterByCategory = async (req, res) => {
  const { category } = req.params;
  const listings = await Listing.find({ category });
  res.json({ listings });
};
