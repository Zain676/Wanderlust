const Listing = require("../models/listing");
const axios = require('axios');
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
  res.render("listings/show.ejs", { listing, apiKey: process.env.TOMTOM_API_KEY });
};

module.exports.createListing = async (req, res, next) => {
  try {
    // Geocode address to get coordinates
    const geoResponse = await axios.get(
      `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(req.body.listing.city)}.json?key=${TOMTOM_API_KEY}`
    );

    const results = geoResponse.data.results;

    // Handle invalid or unfound locations
    if (!results || results.length === 0 || !results[0].position) {
      req.flash('error', 'City not found. Please enter a valid location.');
      return res.redirect('/listings/new');
    }

    // extract the data from geoResponse.data.results
    const { lat, lon: lng } = results[0].position;

    let url = req.file?.path || '';
    let filename = req.file?.filename || '';

    const newListing = new Listing({
      ...req.body.listing,
      coordinates: { lat, lng },
      owner: req.user._id,
      image: { url, filename }
    });

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

module.exports.updateListing = async (req, res) => {
  // Geocode if location changed
  if (req.body.listing.city) {
    const geoResponse = await axios.get(
      `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(req.body.listing.city)}.json?key=${TOMTOM_API_KEY}`
    );
    req.body.listing.coordinates = {
      lat: geoResponse.data.results[0].position.lat,
      lng: geoResponse.data.results[0].position.lon
    };
  }

  let { id } = req.params;
  let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

  if (typeof req.file !== "undefined") {
    let url = req.file.path;
    let filename = req.file.filename;
    listing.image = { url, filename };
    await listing.save();  
  }

  req.flash("success", "Listing Updated");
  res.redirect(`/listings/${id}`);
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