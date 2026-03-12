/**
 * Auth integration tests.
 * These tests use TestingModule and mock PrismaService + AuditService.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

const mockUsersService = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
};

const mockAuditService = {
  log: jest.fn().mockResolvedValue({}),
};

describe('AuthService (integration)', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1d' },
        }),
      ],
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('creates a user and returns access token', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({
        id: 'user-1',
        name: 'Dr. Ana',
        email: 'ana@example.com',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.register({
        name: 'Dr. Ana',
        email: 'ana@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.user.email).toBe('ana@example.com');
      expect(mockUsersService.create).toHaveBeenCalledTimes(1);
    });

    it('throws ConflictException when email already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          name: 'Dr. Ana',
          email: 'existing@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('returns access token with valid credentials', async () => {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('correct-password', 1);

      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        name: 'Dr. Ana',
        email: 'ana@example.com',
        passwordHash: hash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.login({
        email: 'ana@example.com',
        password: 'correct-password',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.user.id).toBe('user-1');
    });

    it('throws UnauthorizedException with wrong password', async () => {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('correct-password', 1);

      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        name: 'Dr. Ana',
        email: 'ana@example.com',
        passwordHash: hash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.login({
          email: 'ana@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
