import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

const FRONTEND_ROOT = process.cwd();
const REPO_ROOT = path.resolve(FRONTEND_ROOT, "..");
const HOME_DIR = os.homedir();

const MIME_BY_EXT: Record<string, string> = {
  ".csv": "text/csv; charset=utf-8",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
};

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function expandPath(p: string): string {
  if (p.startsWith("~/") || p === "~") {
    return path.join(HOME_DIR, p.slice(1));
  }
  return p;
}

function resolveCandidates(rawPath: string): string[] {
  const decoded = decodeURIComponent(rawPath).trim();
  const fileStripped = decoded.startsWith("file://")
    ? new URL(decoded).pathname
    : decoded;
  const normalized = expandPath(fileStripped);

  const candidates: string[] = [];

  if (path.isAbsolute(normalized)) {
    candidates.push(path.normalize(normalized));

    // Treat '/skills/x.csv' like repository-root relative when applicable.
    if (!normalized.startsWith(REPO_ROOT)) {
      candidates.push(path.resolve(REPO_ROOT, normalized.slice(1)));
    }
  } else {
    candidates.push(path.resolve(REPO_ROOT, normalized));
  }

  return Array.from(new Set(candidates));
}

function isAllowedPath(filePath: string): boolean {
  const insideRepo = filePath === REPO_ROOT || filePath.startsWith(`${REPO_ROOT}${path.sep}`);
  const insideHome = filePath === HOME_DIR || filePath.startsWith(`${HOME_DIR}${path.sep}`);
  return insideRepo || insideHome;
}

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const rawPath = req.nextUrl.searchParams.get("path");
    if (!rawPath) {
      return NextResponse.json({ error: "`path` is required" }, { status: 400 });
    }

    if (isHttpUrl(rawPath)) {
      const res = await fetch(rawPath);
      if (!res.ok) {
        const details = await res.text();
        return NextResponse.json(
          { error: "Failed to fetch remote file", details },
          { status: res.status }
        );
      }

      const ext = path.extname(rawPath).toLowerCase();
      const mime = MIME_BY_EXT[ext] || "application/octet-stream";
      const data = await res.arrayBuffer();

      return new Response(data, {
        status: 200,
        headers: {
          "Content-Type": mime,
          "Cache-Control": "no-store",
        },
      });
    }

    const candidates = resolveCandidates(rawPath);

    let existingPath: string | null = null;
    for (const candidate of candidates) {
      if (!isAllowedPath(candidate)) {
        continue;
      }

      try {
        await fs.access(candidate);
        existingPath = candidate;
        break;
      } catch {
        // continue trying next candidate
      }
    }

    if (!existingPath) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const ext = path.extname(existingPath).toLowerCase();
    const mime = MIME_BY_EXT[ext];
    if (!mime) {
      return NextResponse.json(
        { error: "Unsupported file type for preview" },
        { status: 400 }
      );
    }

    const data = await fs.readFile(existingPath);
    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to load preview file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
