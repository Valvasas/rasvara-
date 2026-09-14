"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { wajibPemilik } from "@/lib/auth";

export async function aksiToggleAktifMenu(id: string, aktifBaru: boolean) {
  await wajibPemilik();

  await db.menu.update({
    where: { id },
    data: { aktif: aktifBaru },
  });

  revalidatePath("/admin/menu");
  revalidatePath("/menu");
  revalidatePath("/");
  return { sukses: true };
}

export async function aksiUpdateKapasitasMenu(
  id: string,
  kapasitas: number | null
) {
  await wajibPemilik();

  await db.menu.update({
    where: { id },
    data: { kapasitasHarian: kapasitas },
  });

  revalidatePath("/admin/menu");
  return { sukses: true };
}

