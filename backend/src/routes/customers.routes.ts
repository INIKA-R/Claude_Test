import { Router } from "express";
import * as customersController from "../controllers/customers.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(customersController.listCustomers));
router.post("/", asyncHandler(customersController.createCustomer));
router.get("/:customerId", asyncHandler(customersController.getCustomer));
router.put("/:customerId", asyncHandler(customersController.updateCustomer));
router.delete("/:customerId", asyncHandler(customersController.deleteCustomer));

export default router;
