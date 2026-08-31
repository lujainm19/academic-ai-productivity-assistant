import { Router } from "express";
import { isCanvasConfigured, getCourses, getAllUpcomingAssignments } from "../lib/canvasClient.js";

export const canvasRouter = Router();

// Every handler checks isCanvasConfigured() up front and returns 501 (Not
// Implemented) with a clear reason rather than letting a missing token blow
// up as an opaque network error — the frontend uses this to fall back to
// mock data gracefully instead of showing a broken page.
canvasRouter.use((req, res, next) => {
  if (!isCanvasConfigured()) {
    return res.status(501).json({
      error: "canvas_not_configured",
      message: "Set CANVAS_BASE_URL and CANVAS_API_TOKEN in server/.env to enable Canvas sync.",
    });
  }
  next();
});

canvasRouter.get("/courses", async (req, res) => {
  try {
    const courses = await getCourses();
    res.json(courses);
  } catch (err) {
    res.status(502).json({ error: "canvas_request_failed", message: err.message });
  }
});

canvasRouter.get("/assignments", async (req, res) => {
  try {
    const assignments = await getAllUpcomingAssignments();
    res.json(assignments);
  } catch (err) {
    res.status(502).json({ error: "canvas_request_failed", message: err.message });
  }
});
