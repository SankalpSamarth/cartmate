"use client";

import { useState, useCallback } from "react";
import { getMyPost, saveMyPost, clearMyPost, StoredPost } from "@/lib/device";
import { deleteOrder } from "@/lib/api";

export function useMyPost() {
  const [myPost, setMyPost] = useState<StoredPost | null>(getMyPost);

  const persist = useCallback((post: StoredPost) => {
    saveMyPost(post);
    setMyPost(post);
  }, []);

  const cancel = useCallback(
    async (onRemove?: (id: string) => void) => {
      if (!myPost) return;
      await deleteOrder(myPost.id, myPost.device_id);
      clearMyPost();
      setMyPost(null);
      onRemove?.(myPost.id);
    },
    [myPost]
  );

  const clear = useCallback(() => {
    clearMyPost();
    setMyPost(null);
  }, []);

  const isActive = myPost !== null && new Date(myPost.expires_at) > new Date();

  return { myPost: isActive ? myPost : null, persist, cancel, clear };
}
