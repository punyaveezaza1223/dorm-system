import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import RecoverAccount from "./pages/RecoverAccount";
import VerifyEmail from "./pages/VerifyEmail";

// User
import User from "./pages/user/User";
import Dashboard from "./pages/user/Dashboard";
import Repair from "./pages/user/Repair";
import Complaint from "./pages/user/Complaint";
import Payment from "./pages/user/Payment";
import Parcel from "./pages/user/Parcel";
import Announcement from "./pages/user/Announcement";
import Notifications, { NotificationDetail } from "./pages/user/Notifications";
import Profile from "./pages/user/Profile";

// Admin
import Admin from "./pages/admin/Admin";
import AdminDashboard from "./pages/admin/Dashboard";
import Room from "./pages/admin/Room";
import AdminPayment from "./pages/admin/Payment";
import AdminRepair from "./pages/admin/Repair";
import Utility from "./pages/admin/Utility";
import AdminParcel from "./pages/admin/Parcel";
import AdminAnnouncement from "./pages/admin/Announcement";
import Residents from "./pages/admin/Residents";

function App() {
  return (
    <Routes>
      {/* Login */}
      <Route path="/" element={<Login />} />
      <Route path="/recover-account" element={<RecoverAccount />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* ================= USER ================= */}
      <Route path="/user" element={<User />}>
        <Route index element={<Dashboard />} />
        <Route path="repair" element={<Repair />} />
        <Route path="complaint" element={<Complaint />} />
        <Route path="payment" element={<Payment />} />
        <Route path="parcel" element={<Parcel />} />
        <Route path="announcement" element={<Announcement />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="notifications/:id" element={<NotificationDetail />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* ================= ADMIN ================= */}
      <Route path="/admin" element={<Admin />}>
        <Route index element={<AdminDashboard />} />
        <Route path="room" element={<Room />} />
        <Route path="payment" element={<AdminPayment />} />
        <Route path="repair" element={<AdminRepair />} />
        <Route path="utility" element={<Utility />} />
        <Route path="parcel" element={<AdminParcel />} />
        <Route path="announcement" element={<AdminAnnouncement />} />
        <Route path="residents" element={<Residents />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
