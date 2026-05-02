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

async function uploadFromUrl(url, folderPath, fileName) {
  const fullPublicId = `${folderPath}/${fileName}`;
  try {
    const existing = await cloudinary.api.resource(fullPublicId, { resource_type: "auto" }).catch(() => null);
    if (existing) {
      console.log(`  ⏭️  Skip (exists): ${fullPublicId}`);
      return existing.secure_url;
    }
  } catch {}

  const result = await cloudinary.uploader.upload(url, {
    folder: folderPath,
    public_id: fileName,
    overwrite: false,
    resource_type: "auto",
  });
  console.log(`  ✅ Uploaded: ${fullPublicId}`);
  return result.secure_url;
}

console.log("☁️  Uploading HSR Element Icons to Cloudinary...\n");

for (const element of ELEMENTS) {
  const iconUrl = `${baseUrl}/icon/element/${element}.png`;
  await uploadFromUrl(iconUrl, `${BASE_FOLDER}/game/hsr/element_icon`, element);
}

console.log("\n✅ Done!");
