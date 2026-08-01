import { redirect } from "next/navigation";

export default function Home() {
  // The VP "what's working / not working" digest is the landing surface (v3).
  redirect("/digest");
}
