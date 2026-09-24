import { Router } from "express";
import customersRoutes from "./customers.routes";
import inventoryRoutes from "./inventory.routes";
import inventoryAvailabilityRoutes from "./inventoryAvailability.routes";
import ordersRoutes from "./orders.routes";

const router = Router();

router.use("/orders", ordersRoutes);
router.use("/customers", customersRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/inventory-availability", inventoryAvailabilityRoutes);

export default router;
