const Joi = require("joi");

module.exports.listingSchema = Joi.object({
  listing: Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    image: Joi.string().allow("", null),
    price: Joi.number().required().min(0),
    city: Joi.string().required(),
    country: Joi.string().required(),
    coordinates: Joi.object({
      lat: Joi.number().required(),
      lng: Joi.number().required(),
    }).required(),
    category: Joi.string()
      .valid(
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
        "Unique Stays"
      )
      .required(),
  }).required(),
});

module.exports.reviewSchema = Joi.object({
  review: Joi.object({
    rating: Joi.number().required().min(1).max(5),
    comment: Joi.string().required(),
  }).required(),
});
