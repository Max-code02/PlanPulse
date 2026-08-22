import * as admin from "firebase-admin";
try {
  admin.initializeApp({ projectId: "planpluse" });
  admin.auth().listUsers(10)
    .then(res => console.log("Success:", res.users.length))
    .catch(err => console.error("Auth error:", err.message));
} catch(e) {
  console.error("Init error:", e);
}
