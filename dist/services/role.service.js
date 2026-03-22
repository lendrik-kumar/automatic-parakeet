import { roleRepository, } from "../repositories/role.repository.js";
import { adminRepository } from "../repositories/admin.repository.js";
export class RoleError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = "RoleError";
    }
}
export const listRoles = async () => {
    return roleRepository.findAll();
};
export const getRole = async (id) => {
    const role = await roleRepository.findById(id);
    if (!role)
        throw new RoleError(404, "Role not found");
    return role;
};
export const createRole = async (adminId, data) => {
    // Check if role name already exists
    const existing = await roleRepository.findByName(data.roleName);
    if (existing) {
        throw new RoleError(400, "Role with this name already exists");
    }
    const role = await roleRepository.create(data);
    await adminRepository.logActivity(adminId, "CREATE", "Role", role.id);
    return role;
};
export const updateRole = async (adminId, id, data) => {
    const existing = await roleRepository.findById(id);
    if (!existing)
        throw new RoleError(404, "Role not found");
    // Check for role name conflicts
    if (data.roleName && data.roleName !== existing.roleName) {
        const existingByName = await roleRepository.findByName(data.roleName);
        if (existingByName && existingByName.id !== id) {
            throw new RoleError(400, "Role with this name already exists");
        }
    }
    const role = await roleRepository.update(id, data);
    await adminRepository.logActivity(adminId, "UPDATE", "Role", id);
    return role;
};
export const deleteRole = async (adminId, id) => {
    const existing = await roleRepository.findById(id);
    if (!existing)
        throw new RoleError(404, "Role not found");
    // Check if role has admins assigned
    const adminCount = await roleRepository.countAdmins(id);
    if (adminCount > 0) {
        throw new RoleError(400, `Cannot delete role with ${adminCount} admins assigned. Please reassign or delete admins first.`);
    }
    await roleRepository.delete(id);
    await adminRepository.logActivity(adminId, "DELETE", "Role", id);
};
export const getRoleAdmins = async (id) => {
    const role = await roleRepository.findById(id);
    if (!role)
        throw new RoleError(404, "Role not found");
    const admins = await roleRepository.getAdmins(id);
    return {
        role,
        admins,
    };
};
