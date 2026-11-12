import { createApp } from "./app";

const port = Number(process.env.PORT || 3000);
createApp().listen(port, process.env.HOST || "0.0.0.0", () =>
  console.log(`QRnegie: http://localhost:${port}/`),
);
