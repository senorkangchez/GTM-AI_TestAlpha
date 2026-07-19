import { redirect } from "next/navigation";
import { DEFAULT_TERRITORY } from "@/lib/org";

export default function Home() {
  redirect(`/territory/${DEFAULT_TERRITORY}`);
}
