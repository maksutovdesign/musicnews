const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const basePath =
  rawBasePath && rawBasePath !== "/"
    ? `/${rawBasePath.replace(/^\/+|\/+$/g, "")}`
    : "";

export function appPath(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") return basePath || "/";
  return `${basePath}${normalized}`;
}
