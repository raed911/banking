import { getTranslations } from "next-intl/server";
import { requireMerchant } from "@/lib/auth/session";
import { ProgramForm } from "../program-form";

export async function generateMetadata() {
  return { title: (await getTranslations("programs"))("new") };
}

export default async function NewProgramPage() {
  const { membership } = await requireMerchant("programs.manage");
  return <ProgramForm merchantName={membership.merchant.name} />;
}
