const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const { isLoggedIn, isOwner, validateListing } = require("../middleware.js");
const passport = require("passport");
const listingController = require("../controllers/listings.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

router
  .route("/")
  .get(wrapAsync(listingController.index))
  .post(
    isLoggedIn,
    // validateListing,
    upload.single("listing[image]"),
    wrapAsync(listingController.createListing)
    
  );

// New Route
router.get("/new", isLoggedIn, listingController.renderNewForm);

// Filter Listings by Category (for AJAX)
router.get("/category/:category", wrapAsync(listingController.filterByCategory));

router
  .route("/:id")
  .get(wrapAsync(listingController.showListing))
  .put(
    isLoggedIn,
    isOwner,
    upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.updateListing)
  )
  .delete(isLoggedIn, isOwner, wrapAsync(listingController.destroyListing));

// Edit Route
router.get(
  "/:id/edit",
  isLoggedIn,
  isOwner,
  wrapAsync(listingController.renderEditForm)
);

router.get("/api/listings", async (req, res) => {
  const { category, search } = req.query;

  const filter = {};
  if (category) {
    filter.category = category;
  }
  if (search) {
    filter.title = { $regex: search, $options: "i" };
  }

  try {
    const listings = await Listing.find(filter);
    res.json(listings);
  } catch (err) {
    console.error("Error fetching filtered listings:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


module.exports = router;
