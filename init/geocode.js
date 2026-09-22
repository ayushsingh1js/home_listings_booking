require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Listing = require("../models/listing");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");

const geocodingClient = mbxGeocoding({ accessToken: process.env.MAP_TOKEN });

async function main() {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected to DB");

    const listings = await Listing.find({ "geometry.coordinates": { $exists: false } });
    console.log(`Found ${listings.length} listings without coordinates`);

    for (let listing of listings) {
        try {
            const geoData = await geocodingClient.forwardGeocode({
                query: `${listing.location}, ${listing.country}`,
                limit: 1
            }).send();

            const geo = geoData.body.features[0]?.geometry;
            if (geo) {
                listing.geometry = geo;
                await listing.save();
                console.log(`✓ ${listing.title} → ${geo.coordinates}`);
            } else {
                console.log(`✗ No result for: ${listing.location}, ${listing.country}`);
            }
        } catch (err) {
            console.log(`✗ Error for ${listing.title}: ${err.message}`);
        }
    }

    console.log("Done!");
    mongoose.connection.close();
}

main();
