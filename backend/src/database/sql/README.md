# SQL Scripts (SSMS manual execution)

Run in this order against the target MSSQL database:

1. `tables/01_M08944_Customer.sql`
2. `tables/02_M08944_Inventory.sql`
3. `tables/03_M08944_Order.sql`
4. `tables/04_M08944_FulfilmentResult.sql`
5. `tables/05_M08944_Allocation.sql`
6. `procedures/01_M08944_sp_GetCustomer.sql`
7. `procedures/02_M08944_sp_GetInventoryByProduct.sql`
8. `procedures/03_M08944_sp_CreateOrder.sql`
9. `procedures/04_M08944_sp_GetFulfilmentResult.sql`
10. `procedures/05_M08944_sp_CreateAllocation.sql`
11. `procedures/06_M08944_sp_UpdateInventoryQty.sql`
12. `procedures/07_M08944_sp_SaveFulfilmentResult.sql`

Tables are FK-dependency ordered. Each table/proc script is idempotent (drops the
object first if it already exists) so scripts can be re-run safely during development.
