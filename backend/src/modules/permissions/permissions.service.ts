import { Injectable } from '@nestjs/common';
import {PermissionRepository, PermissionRow} from '../../repositories/permission.repository';

// Interface for PermissionsService
interface IPermissionsService {
  // Find all permissions ordered by code
  findAll(): Promise<PermissionRow[]>;

  // Create a new permission
  create(data: { code: string; name: string; description?: string }): Promise<PermissionRow>;

  // Update an existing permission
  update(id: number, data: { code?: string; name?: string; description?: string }): Promise<PermissionRow>;

  // Delete a permission by id
  remove(id: number): Promise<void>;
}

@Injectable()
export class PermissionsService implements IPermissionsService {
  constructor(private readonly permissionRepository: PermissionRepository) {}

  // Find all permissions ordered by code
  findAll() {
    return this.permissionRepository.findAllOrdered();
  }

  // Create a new permission
  create(data: { code: string; name: string; description?: string }) {
    return this.permissionRepository.create(data);
  }

  // Update an existing permission
  update(
    id: number,
    data: { code?: string; name?: string; description?: string },
  ) {
    return this.permissionRepository.update(id, data);
  }

  // Delete a permission by id
  async remove(id: number) {
    await this.permissionRepository.deleteById(id);
  }
}
