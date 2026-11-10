import { createClient } from "@supabase/supabase-js";
import { DEFAULT_CONTENT, clone, validateContent } from "./content.js";
export const SUPABASE_URL = "https://fspcfzxtohaaeoudrack.supabase.co";
export const PUBLISHABLE_KEY = "sb_publishable_GoAREk7bfAgNZbKY7DsHrw_X6JSb3Jd";
export const backend = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
  auth: {
    storageKey: "bba-owner-session",
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
export async function loadContent(preview = false) {
  const local = new URLSearchParams(location.search).get("preview");
  if (preview && local) {
    try {
      const item = JSON.parse(localStorage.getItem("bba-draft-preview"));
      if (item?.key === local && Date.now() - item.at < 3600000)
        return {
          content: validateContent(item.content),
          preview: true,
          revision: "preview",
        };
    } catch {}
  }
  try {
    const { data, error } = await backend
      .from("bba_content")
      .select("content,revision")
      .eq("id", "published")
      .single()
      .abortSignal(AbortSignal.timeout(6000));
    if (error) throw error;
    return { content: validateContent(data.content), revision: data.revision };
  } catch (error) {
    console.warn("Using the included arcade layout:", error.message);
    return { content: clone(DEFAULT_CONTENT), revision: 0, fallback: true };
  }
}
export async function ownerAllowed() {
  const { data, error } = await backend.rpc("bba_is_owner");
  return !error && data === true;
}
