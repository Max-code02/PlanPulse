import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
try {
  initializeApp({ projectId: "planpluse" });
  getAuth().listUsers(10)
    .then(res => console.log("Success:", res.users.length))
    .catch(err => console.error("Auth error:", err.message));
} catch(e) {
  console.error("Init error:", e);
}
