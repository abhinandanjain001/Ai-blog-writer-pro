import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCoXMmiXMdYVXycsk-gfs7DmbI7909lzhg",
  authDomain: "ai-blog-writer-fd5fe.firebaseapp.com",
  projectId: "ai-blog-writer-fd5fe",
  storageBucket: "ai-blog-writer-fd5fe.firebasestorage.app",
  messagingSenderId: "637719990358",
  appId: "1:637719990358:web:d6be7b17243f84296f6bf7",
  measurementId: "G-LXBQ4X1Q1B"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
