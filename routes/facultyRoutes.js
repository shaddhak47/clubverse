import express from "express";

// This is a route factory that takes the instantiated controller
const proctorRoutes = (controller) => {
    const router = express.Router();

    // 1. Get Proctee List
    router.get("/:id/students", controller.getProcteeList.bind(controller));

    // 2. Award Points
    router.post("/activity_points/award", controller.awardPoints.bind(controller));

    // 3. Verify Uploaded Proof (using registration_id in URL, doc_id in body)
    router.post("/registrations/:id/verify-doc", controller.verifyDocument.bind(controller));

    // 4. Get All Events (for Proctor Overview)
    router.get("/:id/events", controller.getEvents.bind(controller));

    // 5. Add New Category
    router.post("/categories", controller.addCategory.bind(controller));

    // 6. Get Existing Categories
    router.get("/categories", controller.getCategories.bind(controller));

    return router;
};

export default proctorRoutes;