import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}
  findAll() { return this.prisma.permission.findMany({ orderBy: { code: 'asc' } }); }
  create(data: { code: string; name: string; description?: string }) {
    return this.prisma.permission.create({ data });
  }
  update(id: number, data: { code?: string; name?: string; description?: string }) {
    return this.prisma.permission.update({ where: { id }, data });
  }
  remove(id: number) { return this.prisma.permission.delete({ where: { id } }); }
}
