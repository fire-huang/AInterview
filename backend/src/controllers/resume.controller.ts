import { Request, Response } from 'express';
import prisma from '../utils/prisma.util';
import { asyncHandler } from '../middleware/error.middleware';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth.middleware';
import path from 'path';
import fs from 'fs';
import { resumeParseService } from '../services/resume-parse.service';
import { aiService } from '../services/ai.service';

/**
 * @desc 上传简历
 */
export const uploadResume = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({
      code: 400,
      message: 'No file uploaded',
    });
  }

  const userId = req.user!.id;
  const { mimetype, size, path: filePath } = req.file;
  const fileName = (req as any)._originalFileName || req.file.originalname;

  // Create resume record
  const resume = await prisma.resume.create({
    data: {
      userId,
      fileUrl: filePath,
      fileType: path.extname(fileName).substring(1),
      fileSize: size,
      fileName: fileName,
      isParsed: false,
    }
  });

  // Return immediately — parsing runs in background
  res.status(201).json({
    code: 0,
    message: 'ok',
    data: {
      resumeId: resume.id,
      fileUrl: resume.fileUrl,
      fileType: resume.fileType,
      fileSize: resume.fileSize,
      fileName: resume.fileName,
      isParsed: false,
    }
  });

  // Async parse (non-blocking)
  (async () => {
    try {
      const rawText = await resumeParseService.extractTextFromFile(resume.fileUrl, resume.fileType);
      const structured = await aiService.parseResume(rawText);
      await prisma.resume.update({
        where: { id: resume.id },
        data: {
          content: structured.content,
          skills: structured.skills,
          experience: structured.experience,
          projects: structured.projects,
          isParsed: true,
        },
      });
    } catch {
      try {
        const rawText = await resumeParseService.extractTextFromFile(resume.fileUrl, resume.fileType);
        await prisma.resume.update({
          where: { id: resume.id },
          data: { content: rawText },
        });
      } catch {}
    }
  })();
});

/**
 * @desc 获取用户简历列表
 */
export const getUserResumes = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  const resumes = await prisma.resume.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fileName: true,
      fileType: true,
      fileSize: true,
      isDefault: true,
      isParsed: true,
      content: true,
      skills: true,
      createdAt: true,
    }
  });

  res.status(200).json({
    code: 0,
    message: 'ok',
    data: resumes,
  });
});

/**
 * @desc 删除简历
 */
export const deleteResume = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  // Check if resume belongs to user
  const resume = await prisma.resume.findFirst({
    where: { id, userId }
  });

  if (!resume) {
    return res.status(404).json({
      code: 404,
      message: 'Resume not found',
    });
  }

  // Delete file
  if (fs.existsSync(resume.fileUrl)) {
    fs.unlinkSync(resume.fileUrl);
  }

  // Delete from database
  await prisma.resume.delete({
    where: { id }
  });

  res.status(200).json({
    code: 0,
    message: 'ok',
    data: {},
  });
});

/**
 * @desc 手动重新解析简历（兜底，上传时解析失败可重新触发）
 */
export const parseResume = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const resume = await prisma.resume.findFirst({
    where: { id, userId },
  });

  if (!resume) {
    return res.status(404).json({
      code: 404,
      message: 'Resume not found',
    });
  }

  try {
    const rawText = await resumeParseService.extractTextFromFile(resume.fileUrl, resume.fileType);
    const structured = await aiService.parseResume(rawText);
    await prisma.resume.update({
      where: { id },
      data: {
        content: structured.content,
        skills: structured.skills,
        experience: structured.experience,
        projects: structured.projects,
        isParsed: true,
      },
    });

    res.status(200).json({
      code: 0,
      message: 'ok',
      data: { isParsed: true },
    });
  } catch (err: any) {
    // Save raw text as fallback
    try {
      const rawText = await resumeParseService.extractTextFromFile(resume.fileUrl, resume.fileType);
      await prisma.resume.update({
        where: { id },
        data: { content: rawText },
      });
    } catch {}

    res.status(500).json({
      code: 500,
      message: err.message || 'Failed to parse resume',
    });
  }
});

/**
 * @desc 获取简历原始文件（PDF 直接返回文件流，DOCX 返回文本）
 * 支持 query param token 用于 iframe/src 直接访问
 */
export const getResumeFile = asyncHandler(async (req: Request, res: Response) => {
  // Auth via query param (for iframe/src access) or Authorization header
  const token = (req.query.token as string) || req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ code: 401, message: 'Authentication required' });
  }

  let userId: string;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    userId = decoded.id;
  } catch {
    return res.status(401).json({ code: 401, message: 'Invalid token' });
  }

  const { id } = req.params;

  const resume = await prisma.resume.findFirst({
    where: { id, userId },
  });

  if (!resume) {
    return res.status(404).json({
      code: 404,
      message: 'Resume not found',
    });
  }

  const absolutePath = path.resolve(resume.fileUrl);

  if (!fs.existsSync(absolutePath)) {
    return res.status(404).json({
      code: 404,
      message: 'File not found on disk',
    });
  }

  // PDF: return raw file stream for browser to render
  if (resume.fileType === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    const safeName = resume.fileName.replace(/[^\x20-\x7E]/g, '_');
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    fs.createReadStream(absolutePath).pipe(res);
    return;
  }

  // DOCX: return extracted text as JSON (browsers can't render DOCX natively)
  try {
    const text = await resumeParseService.extractTextFromFile(resume.fileUrl, resume.fileType);
    res.status(200).json({
      code: 0,
      data: { fileType: resume.fileType, fileName: resume.fileName, text },
    });
  } catch (err: any) {
    res.status(500).json({
      code: 500,
      message: err.message || 'Failed to extract text',
    });
  }
});