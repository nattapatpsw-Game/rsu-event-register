// POST /api/admin/checkin — สลับสถานะเช็คอิน (ต้องเป็นแอดมินเท่านั้น)
// body: { "id": "<registration id>", "checkedIn": true | false }

import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { setCheckedIn } from "@/lib/db";
import { missingEnv, missingEnvMessage } from "@/lib/env";
import { messageFor } from "@/lib/types";

export async function POST(request: NextRequest) {
  const missing = missingEnv();
  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, code: "SERVER_ERROR", message: missingEnvMessage(missing) },
      { status: 503 }
    );
  }

  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: messageFor("UNAUTHORIZED") },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as { id?: unknown; checkedIn?: unknown };
    const id = String(body.id ?? "");
    if (!id) {
      return NextResponse.json(
        { ok: false, code: "MISSING_FIELD", message: messageFor("MISSING_FIELD") },
        { status: 400 }
      );
    }

    await setCheckedIn(session.supabase, id, body.checkedIn === true);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("[admin/checkin]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { ok: false, code: "SERVER_ERROR", message: messageFor("SERVER_ERROR") },
      { status: 500 }
    );
  }
}
