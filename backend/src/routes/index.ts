import { Router } from "express";
import customersRoutes from "./customers.routes";
import inventoryRoutes from "./inventory.routes";
import ordersRoutes from "./orders.routes";

const router = Router();

router.use("/orders", ordersRoutes);
router.use("/customers", customersRoutes);
router.use("/inventory", inventoryRoutes);

export default router;
