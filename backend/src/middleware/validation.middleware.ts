import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

// Validation schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().optional(),
  position: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createInterviewSchema = z.object({
  resumeId: z.string().optional(),
  position: z.string().min(1, 'Position is required'),
  company: z.string().optional(),
  interviewType: z.enum(['technical', 'project', 'hr', 'stress']),
  difficulty: z.number().min(1).max(5),
  focusAreas: z.array(z.string()).optional(),
  additionalInfo: z.string().optional(),
});

export const submitAnswerSchema = z.object({
  content: z.string().min(1, 'Answer content is required'),
});

// Validation middleware
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        res.status(400).json({
          code: 400,
          message: 'Validation failed',
          errors,
        });
      } else {
        next(error);
      }
    }
  };
};

export const validateRegister = validate(registerSchema);
export const validateLogin = validate(loginSchema);
export const validateCreateInterview = validate(createInterviewSchema);
export const validateSubmitAnswer = validate(submitAnswerSchema);
