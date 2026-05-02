import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ELEMENTS = ['Physical', 'Fire', 'Ice', 'Thunder', 'Wind', 'Quantum', 'Imaginary'];
const BASE_FOLDER = "svarog-tracer";
const baseUrl = "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master";

async function uploadFromUrl(url, publicId) {
  try {
    const existing = await cloudinary.api.resource(publicId, { resource_type: "auto" }).catch(() => null);
    if (existing) {
      console.log(`  ⏭️  Skip (exists): ${publicId}`);
      return existing.secure_url;
    }
  } catch {}

  const result = await cloudinary.uploader.upload(url, {
    public_id: publicId,
    overwrite: false,
    resource_type: "auto",
  });
  console.log(`  ✅ Uploaded: ${publicId}`);
  return result.secure_url;
}

console.log("☁️  Uploading HSR Element Icons to Cloudinary...\n");

for (const element of ELEMENTS) {
  const iconUrl = `${baseUrl}/icon/element/${element}.png`;
  const iconId = `${BASE_FOLDER}/game/hsr/element_icon/${element}`;
  await uploadFromUrl(iconUrl, iconId);
}

console.log("\n✅ Done!");
