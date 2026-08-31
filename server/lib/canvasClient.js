// Thin wrapper around the Canvas LMS REST API.
// Docs: https://canvas.instructure.com/doc/api/
//
// Every call needs CANVAS_BASE_URL + CANVAS_API_TOKEN set (see .env.example).
// isCanvasConfigured() lets routes fail fast with a clear message instead of
// a confusing network error when the student hasn't set up credentials yet.

export function isCanvasConfigured() {
  return Boolean(process.env.CANVAS_BASE_URL && process.env.CANVAS_API_TOKEN);
}

async function canvasFetch(path, params = {}) {
  const base = process.env.CANVAS_BASE_URL?.replace(/\/+$/, "");
  const url = new URL(`${base}/api/v1${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach(v => url.searchParams.append(key, v));
    } else if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.CANVAS_API_TOKEN}` },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Canvas API ${res.status} on ${path}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

// Active courses for the authenticated student, with current grade totals.
export async function getCourses() {
  return canvasFetch("/courses", {
    enrollment_state: "active",
    "include[]": ["total_scores", "current_grading_period_scores"],
    per_page: 100,
  });
}

// Upcoming (not-yet-due, not-submitted-focused) assignments for one course.
export async function getCourseAssignments(courseId) {
  return canvasFetch(`/courses/${courseId}/assignments`, {
    "include[]": ["submission"],
    order_by: "due_at",
    per_page: 100,
  });
}

// Convenience: assignments across every active course, flattened and
// annotated with the course name/color so the frontend doesn't need to
// join them itself.
export async function getAllUpcomingAssignments() {
  const courses = await getCourses();
  const perCourse = await Promise.all(
    courses.map(async course => {
      try {
        const assignments = await getCourseAssignments(course.id);
        return assignments.map(a => ({
          id: `${course.id}-${a.id}`,
          courseId: course.id,
          courseName: course.name,
          title: a.name,
          due: a.due_at,
          pointsPossible: a.points_possible,
          submitted: Boolean(a.submission?.submitted_at),
          score: a.submission?.score ?? null,
          htmlUrl: a.html_url,
        }));
      } catch {
        // One misbehaving course (e.g. concluded, no assignments API access)
        // shouldn't take down the whole aggregate response.
        return [];
      }
    })
  );
  return perCourse.flat().filter(a => a.due);
}
