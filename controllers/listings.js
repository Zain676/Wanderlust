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
    console.log('Production Debug - File Received:', req.file); // Add this line
    
    if (!req.file) {
      throw new Error('No image file uploaded');
    }

    // Verify Cloudinary connection
    await cloudinary.api.ping()
      .then(console.log('Cloudinary connection verified'))
      .catch(err => {
        console.error('Cloudinary connection failed:', err);
        throw new Error('Image service unavailable');
      });

    // Rest of your existing code...
    
  } catch (err) {
    console.error('PRODUCTION ERROR DETAILS:', {
      error: err.stack,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        CLOUD_NAME: process.env.CLOUD_NAME ? 'set' : 'missing',
        FILE: req.file ? 'received' : 'missing'
      },
      system: {
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    });
    
    req.flash('error', 
      err.message.includes('Cloudinary') 
        ? 'Image upload service error. Please try another image.'
        : 'Creation failed. Please check all fields.'
    );
    return res.redirect('/listings/new');
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
    if (req.body.listing.city && req.body.listing.city !== existingListing.city) {
      const geoResponse = await axios.get(
        `https://api.tomtom.com/search/2/geocode/${
          encodeURIComponent(req.body.listing.city)
        }.json?key=${TOMTOM_API_KEY}`
      );
      
      if (!geoResponse.data.results || geoResponse.data.results.length === 0) {
        throw new Error('Invalid location');
      }
      
      req.body.listing.coordinates = {
        lat: geoResponse.data.results[0].position.lat,
        lng: geoResponse.data.results[0].position.lon
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
        filename: req.file.filename
      };
    }

    // 4. Perform the update
    await Listing.findByIdAndUpdate(id, updateData);

    req.flash("success", "Listing Updated");
    res.redirect(`/listings/${id}`);
  } catch (err) {
    if (err.message === 'Invalid location') {
      req.flash('error', 'Could not find coordinates for the specified city');
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