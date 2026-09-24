import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import CustomerMaintenancePage from "./pages/CustomerMaintenancePage";
import InventoryMaintenancePage from "./pages/InventoryMaintenancePage";
import OrderResultLookupPage from "./pages/OrderResultLookupPage";
import OrderSubmissionPage from "./pages/OrderSubmissionPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/orders/new" replace />} />
          <Route path="customers" element={<CustomerMaintenancePage />} />
          <Route path="inventory" element={<InventoryMaintenancePage />} />
          <Route path="orders/new" element={<OrderSubmissionPage />} />
          <Route path="orders/lookup" element={<OrderResultLookupPage />} />
          <Route path="*" element={<Navigate to="/orders/new" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
