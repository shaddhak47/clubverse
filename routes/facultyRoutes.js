import express from "express";

// Route factory for FacultyController
const facultyRoutes = (controller) => {
    const router = express.Router();

    // Create an event
    router.post("/events", controller.createEvent.bind(controller));

    // Assign role for an event (volunteers, organizers)
    router.post("/events/:id/assign-role", controller.assignRole.bind(controller));

    // Get participants and assigned roles for an event
    router.get("/events/:id/participants", controller.getParticipants.bind(controller));

    // Generate QR for attendance
    router.post("/events/:id/generate-qr", controller.generateQR.bind(controller));

    // Get all events (with optional filters)
    router.get("/events", controller.getAllEvents.bind(controller));

    // Get events created by a faculty member
    router.get("/:id/events", controller.getCreatedEvents.bind(controller));

    return router;
};

export default facultyRoutes;