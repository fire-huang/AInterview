import { Request, Response } from 'express';
import prisma from '../utils/prisma.util';
import { asyncHandler } from '../middleware/error.middleware';
import { hashPassword, comparePassword, generateToken } from '../utils/jwt.util';
import { registerSchema } from '../middleware/validation.middleware';

/**
 * @desc 用户注册
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name, position } = req.body;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    return res.status(400).json({
      code: 400,
      message: 'Email already registered',
    });
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: position,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    }
  });

  // Generate JWT token
  const token = generateToken(user.id, user.email);

  res.status(201).json({
    code: 0,
    message: 'ok',
    data: {
      userId: user.id,
      email: user.email,
      name: user.name,
      token,
    }
  });
});

/**
 * @desc 用户登录
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    return res.status(401).json({
      code: 401,
      message: 'Invalid email or password',
    });
  }

  // Check password
  const isPasswordValid = await comparePassword(password, user.password);

  if (!isPasswordValid) {
    return res.status(401).json({
      code: 401,
      message: 'Invalid email or password',
    });
  }

  // Generate JWT token
  const token = generateToken(user.id, user.email);

  res.status(200).json({
    code: 0,
    message: 'ok',
    data: {
      userId: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      token,
    }
  });
});
