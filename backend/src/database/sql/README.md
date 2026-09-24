# SQL Scripts (SSMS manual execution)

Run in this order against the target MSSQL database:

## Tables (FK-dependency ordered)
1. `tables/01_M08944_Customer.sql`
2. `tables/02_M08944_Inventory.sql`
3. `tables/03_M08944_Order.sql`
4. `tables/04_M08944_FulfilmentResult.sql`
5. `tables/05_M08944_Allocation.sql`

Phase 5 delta (Priority partial fulfilment — run after the above, on top of
an existing Phase 1-4 database; do not re-run 01-05):
6. `tables/06_M08944_Config.sql`
7. `tables/07_M08944_Backorder.sql`

## Stored procedures

FRD §7 indicative set (order fulfilment flow):
6. `procedures/01_M08944_sp_GetCustomer.sql`
7. `procedures/02_M08944_sp_GetInventoryByProduct.sql`
8. `procedures/03_M08944_sp_CreateOrder.sql`
9. `procedures/04_M08944_sp_GetFulfilmentResult.sql`
10. `procedures/05_M08944_sp_CreateAllocation.sql`
11. `procedures/06_M08944_sp_UpdateInventoryQty.sql`
12. `procedures/07_M08944_sp_SaveFulfilmentResult.sql`

Added in Phase 2 for the Customer/Inventory CRUD APIs (not in FRD §7's list, which
is indicative rather than exhaustive):
13. `procedures/08_M08944_sp_GetAllCustomers.sql`
14. `procedures/09_M08944_sp_CreateCustomer.sql`
15. `procedures/10_M08944_sp_UpdateCustomer.sql`
16. `procedures/11_M08944_sp_DeleteCustomer.sql`
17. `procedures/12_M08944_sp_GetInventoryByKey.sql`
18. `procedures/13_M08944_sp_GetAllInventory.sql`
19. `procedures/14_M08944_sp_CreateInventory.sql`
20. `procedures/15_M08944_sp_UpdateInventory.sql`
21. `procedures/16_M08944_sp_DeleteInventory.sql`

Phase 5 delta (Priority partial fulfilment — backorder + configurable
release threshold):
22. `procedures/17_M08944_sp_CreateBackorder.sql`
23. `procedures/18_M08944_sp_GetBackorderByOrderId.sql`
24. `procedures/19_M08944_sp_GetConfigValue.sql`

Tables are FK-dependency ordered. Each table/proc script is idempotent (drops the
object first if it already exists) so scripts can be re-run safely during development.
