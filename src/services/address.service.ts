import { addressRepository } from "../repositories/address.repository.js";
import { AppError } from "../utils/AppError.js";
import type {
  CreateAddressInput,
  UpdateAddressInput,
} from "../repositories/address.repository.js";

// ─── Custom Error ───────────────────────────────────────────────────────────

export class AddressError extends AppError {}

const INDIA_PINCODE_REGEX = /^\d{6}$/;
const US_ZIP_REGEX = /^\d{5}(?:-\d{4})?$/;
const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;
const NAME_REGEX = /^[A-Za-z][A-Za-z\s.'-]{1,254}$/;

const validateAddressFormat = (data: Omit<CreateAddressInput, "userId">) => {
  if (!NAME_REGEX.test(data.fullName.trim())) {
    throw new AddressError(400, "Invalid full name format");
  }

  if (!PHONE_REGEX.test(data.phone.trim())) {
    throw new AddressError(400, "Invalid phone number format");
  }

  const postalCode = data.postalCode.trim();
  const countryHint = `${data.state} ${data.city}`.toUpperCase();

  const looksLikeIndia =
    countryHint.includes("INDIA") ||
    countryHint.includes("DELHI") ||
    countryHint.includes("MUMBAI") ||
    countryHint.includes("BENGALURU");

  const looksLikeUS =
    countryHint.includes("USA") ||
    countryHint.includes("UNITED STATES") ||
    countryHint.includes("CALIFORNIA") ||
    countryHint.includes("NEW YORK");

  if (looksLikeIndia && !INDIA_PINCODE_REGEX.test(postalCode)) {
    throw new AddressError(400, "Invalid India postal code format");
  }

  if (looksLikeUS && !US_ZIP_REGEX.test(postalCode)) {
    throw new AddressError(400, "Invalid US ZIP code format");
  }

  if (!looksLikeIndia && !looksLikeUS) {
    const genericPostal = /^[A-Za-z0-9\s-]{3,12}$/;
    if (!genericPostal.test(postalCode)) {
      throw new AddressError(400, "Invalid postal code format");
    }
  }
};

// ─── Service Functions ──────────────────────────────────────────────────────

/**
 * Get all addresses for a user
 */
export const listUserAddresses = async (userId: string) => {
  const addresses = await addressRepository.findByUserId(userId);
  return addresses;
};

/**
 * Get a single address by ID
 * Validates that the address belongs to the user
 */
export const getAddressById = async (userId: string, addressId: string) => {
  const address = await addressRepository.findById(addressId);

  if (!address) {
    throw new AddressError(404, "Address not found");
  }

  if (address.userId !== userId) {
    throw new AddressError(403, "You do not have permission to access this address");
  }

  return address;
};

/**
 * Create a new address for a user
 * If this is the first address, automatically set it as default shipping and billing
 */
export const createAddress = async (
  userId: string,
  data: Omit<CreateAddressInput, "userId">,
) => {
  validateAddressFormat(data);

  // Check if user has any existing addresses
  const existingCount = await addressRepository.countByUserId(userId);
  const isFirstAddress = existingCount === 0;

  // If first address, set as default for both shipping and billing
  const addressData: CreateAddressInput = {
    ...data,
    userId,
    isDefaultShipping: isFirstAddress ? true : data.isDefaultShipping ?? false,
    isDefaultBilling: isFirstAddress ? true : data.isDefaultBilling ?? false,
  };

  // If setting as default, unset previous defaults
  if (addressData.isDefaultShipping) {
    await addressRepository.unsetDefaultShipping(userId);
  }
  if (addressData.isDefaultBilling) {
    await addressRepository.unsetDefaultBilling(userId);
  }

  const address = await addressRepository.create(addressData);
  return address;
};

/**
 * Update an address
 * Validates that the address belongs to the user
 */
export const updateAddress = async (
  userId: string,
  addressId: string,
  data: UpdateAddressInput,
) => {
  // Verify ownership
  await getAddressById(userId, addressId);

  const updatedAddress = await addressRepository.update(addressId, data);
  return updatedAddress;
};

/**
 * Delete an address
 * Validates that the address belongs to the user
 */
export const deleteAddress = async (userId: string, addressId: string) => {
  // Verify ownership
  const address = await getAddressById(userId, addressId);

  await addressRepository.delete(addressId);

  // If deleted address was default, check if user has other addresses
  // If only one address remains, automatically set it as default
  if (address.isDefaultShipping || address.isDefaultBilling) {
    const remainingAddresses = await addressRepository.findByUserId(userId);
    
    if (remainingAddresses.length === 1) {
      const lastAddress = remainingAddresses[0];
      
      if (address.isDefaultShipping) {
        await addressRepository.setDefaultShipping(lastAddress.id);
      }
      if (address.isDefaultBilling) {
        await addressRepository.setDefaultBilling(lastAddress.id);
      }
    }
  }

  return { message: "Address deleted successfully" };
};

/**
 * Set an address as default shipping
 * Validates that the address belongs to the user
 * Atomically unsets previous default
 */
export const setDefaultShipping = async (userId: string, addressId: string) => {
  // Verify ownership
  await getAddressById(userId, addressId);

  // Unset previous default and set new default
  await addressRepository.unsetDefaultShipping(userId);
  const updatedAddress = await addressRepository.setDefaultShipping(addressId);

  return updatedAddress;
};

/**
 * Set an address as default billing
 * Validates that the address belongs to the user
 * Atomically unsets previous default
 */
export const setDefaultBilling = async (userId: string, addressId: string) => {
  // Verify ownership
  await getAddressById(userId, addressId);

  // Unset previous default and set new default
  await addressRepository.unsetDefaultBilling(userId);
  const updatedAddress = await addressRepository.setDefaultBilling(addressId);

  return updatedAddress;
};
