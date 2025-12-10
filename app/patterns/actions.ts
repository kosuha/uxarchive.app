"use server"

import { fetchShareList, type ShareListQueryParams } from "@/lib/api/share"

export async function getPatternsAction(params: ShareListQueryParams) {
  try {
    const response = await fetchShareList(params, {
      next: { revalidate: 60 },
    })
    return {
      posts: (response.items ?? []).filter((item) => item.published && item.isPublic),
      hasNextPage: response.hasNextPage,
    }
  } catch (error) {
    console.error("Failed to fetch patterns via server action", error)
    return { posts: [], hasNextPage: false, error: "Failed to load more posts" }
  }
}
