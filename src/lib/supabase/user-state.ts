import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export const USER_STATE_TABLE = "user_state";
export const MISTAKE_IMAGE_BUCKET = "mistake-images";

function inferFileExtension(fileName: string, mimeType: string) {
  const extension = fileName.includes(".")
    ? fileName.slice(fileName.lastIndexOf(".")).toLowerCase()
    : "";

  if (extension) {
    return extension;
  }

  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/gif":
      return ".gif";
    case "image/webp":
      return ".webp";
    default:
      return ".img";
  }
}

export async function requireUser(client: SupabaseClient): Promise<User> {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error("当前登录会话已失效，请重新登录。");
  }

  return user;
}

export async function ensureUserState(client: SupabaseClient) {
  const user = await requireUser(client);
  const { data, error } = await client
    .from(USER_STATE_TABLE)
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    const { error: insertError } = await client
      .from(USER_STATE_TABLE)
      .insert({ user_id: user.id });

    if (insertError && insertError.code !== "23505") {
      throw insertError;
    }
  }

  return user;
}

export async function selectUserState<T>(
  client: SupabaseClient,
  columns: string,
): Promise<{ user: User; data: T }> {
  const user = await ensureUserState(client);
  const { data, error } = await client
    .from(USER_STATE_TABLE)
    .select(columns)
    .eq("user_id", user.id)
    .single();

  if (error) {
    throw error;
  }

  return {
    user,
    data: data as T,
  };
}

export async function updateUserState(
  client: SupabaseClient,
  patch: Record<string, unknown>,
) {
  const user = await requireUser(client);
  const { error } = await client
    .from(USER_STATE_TABLE)
    .update(patch)
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }
}

export function buildMistakeStoragePath(
  userId: string,
  mistakeId: string,
  fileName: string,
  mimeType: string,
) {
  return `${userId}/${mistakeId}${inferFileExtension(fileName, mimeType)}`;
}
