import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { installStorageDriver } from "./services/storage.js";
import "./styles/index.css";

installStorageDriver();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
