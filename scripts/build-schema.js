#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemasDir = path.join(__dirname, "../prisma/schemas");
const mainSchema = path.join(__dirname, "../prisma/schema.prisma");

// Read generator and datasource from main schema template
const generator = `generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}
`;

// Get all .prisma files from schemas folder, sorted for consistent ordering
const schemaFiles = fs
  .readdirSync(schemasDir)
  .filter((file) => file.endsWith(".prisma"))
  .sort();

console.log(`📦 Combining ${schemaFiles.length} schema files...`);

// Combine all schema files
let combinedContent = generator + "\n";

schemaFiles.forEach((file, index) => {
  const filePath = path.join(schemasDir, file);
  const content = fs.readFileSync(filePath, "utf-8");
  combinedContent += content;

  if (index < schemaFiles.length - 1) {
    combinedContent += "\n";
  }
});

// Write to main schema.prisma
fs.writeFileSync(mainSchema, combinedContent);
console.log(`✅ Schema combined successfully: ${mainSchema}`);
