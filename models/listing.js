const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");

const listingSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  image: {
    url: String,
    filename: String,
  },
  images: [
    {
      url: String,
      filename: String,
    },
  ],
  price: Number,
  city: String,
  country: String,
  coordinates: {
    lat: Number,
    lng: Number,
  },
  reviews: [
    {
      type: Schema.Types.ObjectId,
      ref: "Review",
    },
  ],

  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  category: {
    type: String,
    enum: [
      "Budget",
      "Luxury",
      "Family",
      "Pet Friendly",
      "Beachside",
      "Mountain",
      "Private Room",
      "Entire Home",
      "With Pool",
      "Free Parking",
      "WiFi",
      "City Center",
      "Quiet Area",
      "Couples",
      "Adventure",
      "Nature Stay",
      "Unique Stays",
    ],
    required: true,
  },
});

listingSchema.post("findOneAndDelete", async (listing) => {
  if (listing) {
    await Review.deleteMany({ _id: { $in: listing.reviews } });
  }
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;
