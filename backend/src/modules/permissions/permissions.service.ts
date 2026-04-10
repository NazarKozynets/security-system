import { Injectable } from '@nestjs/common';
import { PermissionRepository } from '../../repositories/permission.repository';

@Injectable()
export class PermissionsService {
  constructor(private readonly permissionRepository: PermissionRepository) {}
  findAll() {
    return this.permissionRepository.findAllOrdered();
  }
  create(data: { code: string; name: string; description?: string }) {
    return this.permissionRepository.create(data);
  }
  update(
    id: number,
    data: { code?: string; name?: string; description?: string },
  ) {
    return this.permissionRepository.update(id, data);
  }
  async remove(id: number) {
    await this.permissionRepository.deleteById(id);
  }
}
