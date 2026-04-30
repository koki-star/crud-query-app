const POSTS_URL = 'https://jsonplaceholder.typicode.com/posts';

export type Post = {
  body: string;
  id: number;
  title: string;
  userId: number;
};

type PostInput = {
  body: string;
  title: string;
  userId: number;
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const text = await response.text();

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export async function fetchPosts(userId?: number) {
  const url = userId ? `${POSTS_URL}?userId=${userId}` : POSTS_URL;
  return requestJson<Post[]>(url);
}

export async function createPost(input: PostInput) {
  return requestJson<Post>(POSTS_URL, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updatePost(input: Post) {
  return requestJson<Post>(`${POSTS_URL}/${input.id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function patchPostTitle(id: number, title: string) {
  return requestJson<Post>(`${POSTS_URL}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
}

export async function deletePost(id: number) {
  return requestJson<void>(`${POSTS_URL}/${id}`, {
    method: 'DELETE',
  });
}
