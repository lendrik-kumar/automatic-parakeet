import { addressRepository } from "../repositories/address.repository.js";
// ─── Custom Error ───────────────────────────────────────────────────────────
export class AddressError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = "AddressError";
    }
}
// ─── Service Functions ──────────────────────────────────────────────────────
/**
 * Get all addresses for a user
 */
export const listUserAddresses = async (userId) => {
    const addresses = await addressRepository.findByUserId(userId);
    return addresses;
};
/**
 * Get a single address by ID
 * Validates that the address belongs to the user
 */
export const getAddressById = async (userId, addressId) => {
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
export const createAddress = async (userId, data) => {
    // Check if user has any existing addresses
    const existingCount = await addressRepository.countByUserId(userId);
    const isFirstAddress = existingCount === 0;
    // If first address, set as default for both shipping and billing
    const addressData = {
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
export const updateAddress = async (userId, addressId, data) => {
    // Verify ownership
    await getAddressById(userId, addressId);
    const updatedAddress = await addressRepository.update(addressId, data);
    return updatedAddress;
};
/**
 * Delete an address
 * Validates that the address belongs to the user
 */
export const deleteAddress = async (userId, addressId) => {
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
export const setDefaultShipping = async (userId, addressId) => {
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
export const setDefaultBilling = async (userId, addressId) => {
    // Verify ownership
    await getAddressById(userId, addressId);
    // Unset previous default and set new default
    await addressRepository.unsetDefaultBilling(userId);
    const updatedAddress = await addressRepository.setDefaultBilling(addressId);
    return updatedAddress;
};
