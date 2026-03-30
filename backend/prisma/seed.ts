import 'dotenv/config';
import { EventType, Severity, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {prisma, prismaPool} from "./prisma.client";

async function main() {
  const permissions = [
    ['user.read', 'Read users'],
    ['user.create', 'Create users'],
    ['user.update', 'Update users'],
    ['user.delete', 'Disable users'],
    ['role.read', 'Read roles'],
    ['role.manage', 'Manage roles'],
    ['role.assign', 'Assign user roles'],
    ['permission.read', 'Read permissions'],
    ['permission.manage', 'Manage permissions'],
    ['security.log.read', 'Read security logs'],
    ['security.report.read', 'Read security reports'],
  ];

  for (const [code, name] of permissions) {
    await prisma.permission.upsert({
      where: { code },
      update: { name },
      create: { code, name },
    });
  }

  const roles = ['admin', 'security_analyst', 'operator', 'auditor', 'user'];
  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, description: `${roleName} role` },
    });
  }

  const rolePermissions: Record<string, string[]> = {
    admin: permissions.map((x) => x[0]),
    security_analyst: ['security.log.read', 'security.report.read', 'user.read', 'role.read'],
    operator: ['user.read', 'user.update', 'role.read'],
    auditor: ['security.log.read', 'security.report.read', 'user.read'],
    user: [],
  };

  for (const roleName of Object.keys(rolePermissions)) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
    for (const code of rolePermissions[roleName]) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { code } });
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: permission.id },
        },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  const demoUsers = [
    ['admin@university.local', 'Admin12345!', 'System', 'Admin', 'admin'],
    ['analyst@university.local', 'Analyst12345!', 'Security', 'Analyst', 'security_analyst'],
    ['user@university.local', 'User12345!', 'Regular', 'User', 'user'],
  ];

  for (const [email, plainPassword, firstName, lastName, roleName] of demoUsers) {
    const passwordHash = await bcrypt.hash(plainPassword, 10);
    const user = await prisma.user.upsert({
      where: { email },
      update: { firstName, lastName, status: UserStatus.ACTIVE },
      create: { email, passwordHash, firstName, lastName, status: UserStatus.ACTIVE },
    });
    const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
  }

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@university.local' } });

  await prisma.loginAttempt.createMany({
    data: [
      { email: admin.email, userId: admin.id, success: true, ipAddress: '127.0.0.1' },
      { email: 'analyst@university.local', success: false, failureReason: 'Invalid credentials', ipAddress: '10.0.0.8' },
      { email: 'user@university.local', success: false, failureReason: 'Invalid credentials', ipAddress: '10.0.0.9' },
    ],
  });

  await prisma.securityEvent.createMany({
    data: [
      { userId: admin.id, eventType: EventType.LOGIN_SUCCESS, severity: Severity.LOW, description: 'Admin login success' },
      { userId: admin.id, eventType: EventType.REPORT_GENERATED, severity: Severity.LOW, description: 'Dashboard report generated' },
    ],
  });

  console.log('Seed complete. Credentials:');
  console.log('admin@university.local / Admin12345!');
  console.log('analyst@university.local / Analyst12345!');
  console.log('user@university.local / User12345!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await prismaPool.end();
    });
