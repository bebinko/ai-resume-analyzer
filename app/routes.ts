import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/auth", "routes/auth.tsx"),
  route("/upload", "routes/upload.tsx"),
  route("/resume/:id", "routes/resume.tsx"),
  route("revise/:id", "routes/revise.tsx"),
  route("custom-revise/:id", "routes/custom-revise.tsx"),
  route("settings", "routes/settings.tsx"),
  route("privacy", "routes/privacy.tsx"),
  route("about", "routes/about.tsx"),
] satisfies RouteConfig;
