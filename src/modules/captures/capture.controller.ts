import type { Request, Response, NextFunction } from "express";

import { createCaptureSchema, listCapturesByUserSchema, updateCaptureSchema } from "./capture.schema.js";
import { createCapture, deleteCapture, getCaptureById, listCapturesByUser, updateCapture } from "./capture.service.js";
import { AppError } from "../../errors/app-error.js";


export async function createCaptureHandler(req: Request, res: Response, next: NextFunction) {

    try {
        const result = createCaptureSchema.safeParse(req.body);

        if (!result.success) {
            throw new AppError(400, "Invalid request");
        }


        if (!req.user) {
            throw new AppError(401, "Authentication required");
        }

        const capture = await createCapture(
            req.user.id,
            result.data,
        );
        res.status(201).json(capture)
    } catch (error) {
        next(error)
    }
}

export async function listCapturesByUserHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const result = listCapturesByUserSchema.safeParse(req.query);
        
        if (!result.success) {
            throw new AppError(400, "Invalid request");
        }

        const { limit, offset, categoryIds } = result.data;

        if (!req.user) {
            throw new AppError(401, "Authentication required");
        }

        const userId = req.user.id;

        const captures = await listCapturesByUser(
            userId,
            limit,
            offset,
            categoryIds,
        )
        
        res.json({
            data: captures,
            pagination: {
                limit, 
                offset,
            },
        });
    } catch (error) {

        next(error)
    }
}

export async function getCaptureHandler(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
) {
    try {
        const captureId = req.params.id

        if (!captureId) {
            throw new AppError(400, "Capture ID is required");
        }

        if (!req.user) {
            throw new AppError(401, "Authentication required");
        }

        const userId = req.user.id
        
        const capture = await getCaptureById(
            captureId,
            userId
        )

        if (!capture) {
            throw new AppError(404, "Capture not found");
        }

        res.status(200).json({
            data: capture
        })

    } catch (error) {
        next(error)
    }
}

export async function updateCaptureHandler(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
    try {
        const captureId = req.params.id;

        if (!captureId) {
            throw new AppError(400, "Capture ID is required");
        }

        if (!req.user) {
            throw new AppError(401, "Authentication required");
        }

        const result = updateCaptureSchema.safeParse(req.body)

        if (!result.success) {
            throw new AppError(400, "Invalid request");
        }

        const userId = req.user.id

        const capture = await updateCapture(
            captureId,
            userId,
            result.data
        )


        if (!capture) {
            throw new AppError(404, "Capture not found");
        }

    res.status(200).json({
      data: capture,
    });
    } catch (error) {
        next(error)
    }
}

export async function deleteCaptureHandler(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    const captureId = req.params.id;

    if (!captureId) {
      throw new AppError(
        400,
        "Capture Id is required",
      );
    }

    if (!req.user) {
      throw new AppError(
        401,
        "Authentication required",
      );
    }

    const capture = await deleteCapture(
      captureId,
      req.user.id,
    );

    if (!capture) {
      throw new AppError(
        404,
        "Capture not found",
      );
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}