import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  createPost,
  deletePost,
  fetchPosts,
  patchPostTitle,
  type Post,
  updatePost,
} from '@/services/posts';

type FeedbackKind = 'success' | 'error' | 'warning' | 'info';

type FeedbackState = {
  kind: FeedbackKind;
  text: string;
} | null;

const POSTS_QUERY_KEY = ['posts'] as const;

export default function HomeScreen() {
  const queryClient = useQueryClient();
  const [filterInput, setFilterInput] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [userId, setUserId] = useState('1');
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const filterValue = appliedFilter.trim();
  const filterUserId = filterValue === '' ? undefined : Number(filterValue);
  const isFilterValid =
    filterValue === '' || (Number.isInteger(filterUserId) && filterUserId > 0);

  const {
    data: posts = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: [...POSTS_QUERY_KEY, filterValue || 'all'],
    queryFn: () => fetchPosts(filterUserId),
    enabled: isFilterValid,
  });

  const clearForm = () => {
    setTitle('');
    setBody('');
    setUserId('1');
    setEditingPostId(null);
  };

  const updateVisibleCaches = (
    updater: (current: Post[] | undefined, key: readonly unknown[]) => Post[],
  ) => {
    queryClient.setQueriesData<Post[]>(
      { queryKey: POSTS_QUERY_KEY },
      (current, query) => updater(current, query.queryKey),
    );
  };

  const createMutation = useMutation({
    mutationFn: createPost,
    onSuccess: (createdPost) => {
      updateVisibleCaches((current, key) => {
        const currentList = current ?? [];
        const cacheFilter = key[1];

        if (cacheFilter !== 'all' && cacheFilter !== String(createdPost.userId)) {
          return currentList;
        }

        return [createdPost, ...currentList];
      });
      setFeedback({ kind: 'success', text: 'Post created successfully' });
      clearForm();
    },
    onError: () => {
      setFeedback({ kind: 'error', text: 'Could not create the post' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updatePost,
    onSuccess: (updatedPost) => {
      updateVisibleCaches((current, key) => {
        const currentList = current ?? [];
        const cacheFilter = key[1];

        if (cacheFilter !== 'all' && cacheFilter !== String(updatedPost.userId)) {
          return currentList.filter((post) => post.id !== updatedPost.id);
        }

        const nextList = currentList.map((post) =>
          post.id === updatedPost.id ? updatedPost : post,
        );

        if (nextList.some((post) => post.id === updatedPost.id)) {
          return nextList;
        }

        return [updatedPost, ...currentList];
      });
      setFeedback({ kind: 'success', text: 'Post updated successfully' });
      clearForm();
    },
    onError: () => {
      setFeedback({ kind: 'error', text: 'Could not update the post' });
    },
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) =>
      patchPostTitle(id, title),
    onSuccess: (patchedPost) => {
      updateVisibleCaches((current) =>
        (current ?? []).map((post) =>
          post.id === patchedPost.id ? { ...post, ...patchedPost } : post,
        ),
      );
      setFeedback({ kind: 'success', text: 'Title updated' });
    },
    onError: () => {
      setFeedback({ kind: 'error', text: 'Could not update the title' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePost,
    onSuccess: (_, deletedId) => {
      updateVisibleCaches((current) =>
        (current ?? []).filter((post) => post.id !== deletedId),
      );
      setFeedback({ kind: 'success', text: 'Post deleted successfully' });

      if (editingPostId === deletedId) {
        clearForm();
      }
    },
    onError: () => {
      setFeedback({ kind: 'error', text: 'Could not delete the post' });
    },
  });

  const handleApplyFilter = () => {
    const trimmedValue = filterInput.trim();

    if (trimmedValue === '') {
      setAppliedFilter('');
      setFeedback({ kind: 'info', text: 'Showing all posts' });
      return;
    }

    const numericValue = Number(trimmedValue);

    if (!Number.isInteger(numericValue) || numericValue <= 0) {
      setFeedback({ kind: 'warning', text: 'Please enter valid input' });
      return;
    }

    setAppliedFilter(trimmedValue);
    setFeedback({ kind: 'info', text: `Filtering by User ID ${trimmedValue}` });
  };

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    const numericUserId = Number(userId.trim());

    if (
      !trimmedTitle ||
      !trimmedBody ||
      !Number.isInteger(numericUserId) ||
      numericUserId <= 0
    ) {
      setFeedback({ kind: 'warning', text: 'Please enter valid input' });
      return;
    }

    if (editingPostId !== null) {
      updateMutation.mutate({
        id: editingPostId,
        title: trimmedTitle,
        body: trimmedBody,
        userId: numericUserId,
      });
      return;
    }

    createMutation.mutate({
      title: trimmedTitle,
      body: trimmedBody,
      userId: numericUserId,
    });
  };

  const handleEdit = (post: Post) => {
    setEditingPostId(post.id);
    setTitle(post.title);
    setBody(post.body);
    setUserId(String(post.userId));
    setFeedback({ kind: 'info', text: `Editing post #${post.id}` });
  };

  const handlePatch = (post: Post) => {
    patchMutation.mutate({ id: post.id, title: `${post.title} (patched)` });
  };

  const handleDelete = (post: Post) => {
    deleteMutation.mutate(post.id);
  };

  const isBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    patchMutation.isPending ||
    deleteMutation.isPending;
  const postsSummary =
    posts.length === 1 ? '1 post loaded' : `${posts.length} posts loaded`;

  const statusText =
    feedback?.text ??
    (isLoading ? 'Loading posts...' : 'Ready to manage posts');

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.kicker}>JSONPlaceholder + TanStack Query</Text>
            <Text style={styles.title}>crud-query-app</Text>
            <Text style={styles.subtitle}>
              Simple blog post CRUD with filter, visible feedback, and local cache
              updates.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Filter posts</Text>
            <Text style={styles.sectionHint}>
              Enter a User ID to narrow the list, or leave it empty to show all
              posts.
            </Text>
            <Text style={styles.inputLabel}>User ID</Text>
            <TextInput
              value={filterInput}
              onChangeText={setFilterInput}
              placeholder="Enter User ID"
              keyboardType="number-pad"
              style={styles.input}
            />
            <View style={styles.row}>
              <Pressable
                style={[styles.button, styles.primaryButton]}
                onPress={handleApplyFilter}>
                <Text style={styles.buttonText}>Apply filter</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.secondaryButton]}
                onPress={() => {
                  setFilterInput('');
                  setAppliedFilter('');
                  setFeedback({ kind: 'info', text: 'Showing all posts' });
                }}>
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                  Clear
                </Text>
              </Pressable>
            </View>
            <Text style={styles.helperText}>
              {isFilterValid ? 'Filter is ready to use.' : 'Please enter valid input'}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              {editingPostId ? 'Edit post' : 'Create post'}
            </Text>
            <Text style={styles.sectionHint}>
              {editingPostId
                ? 'Update the selected post and save the changes with PUT.'
                : 'Add a post to show visible POST feedback in the demo.'}
            </Text>
            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Title"
              style={styles.input}
            />
            <Text style={styles.inputLabel}>Body</Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Body"
              multiline
              style={[styles.input, styles.multilineInput]}
            />
            <Text style={styles.inputLabel}>User ID</Text>
            <TextInput
              value={userId}
              onChangeText={setUserId}
              placeholder="User ID"
              keyboardType="number-pad"
              style={styles.input}
            />
            <View style={styles.row}>
              <Pressable
                style={[
                  styles.button,
                  styles.primaryButton,
                  isBusy && styles.buttonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isBusy}>
                <Text style={styles.buttonText}>
                  {editingPostId ? 'Update post' : 'Create post'}
                </Text>
              </Pressable>
              {editingPostId ? (
                <Pressable
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => {
                    clearForm();
                    setFeedback({ kind: 'info', text: 'Form cleared' });
                  }}>
                  <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                    Cancel
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <View style={styles.feedbackCard}>
            <Text style={styles.sectionTitle}>Status</Text>
            <View
              style={[
                styles.feedbackBox,
                feedback ? feedbackStyles[feedback.kind] : styles.infoBox,
              ]}>
              <Text style={styles.feedbackText}>{statusText}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.listHeader}>
              <View style={styles.listHeadingGroup}>
                <Text style={styles.sectionTitle}>Posts</Text>
                <Text style={styles.listSummary}>{postsSummary}</Text>
              </View>
              {isLoading ? <ActivityIndicator /> : null}
            </View>
            <View style={styles.listMetaRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {filterValue ? `User ID ${filterValue}` : 'All users'}
                </Text>
              </View>
            </View>

            {isError ? (
              <Text style={styles.errorText}>Failed to load posts.</Text>
            ) : null}

            {!isLoading && posts.length === 0 && !isError ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No posts found.</Text>
                <Text style={styles.emptyText}>
                  Try clearing the filter or using a different User ID.
                </Text>
              </View>
            ) : null}

            <View style={styles.list}>
              {posts.map((post) => (
                <View key={post.id} style={styles.postCard}>
                  <View style={styles.postHeader}>
                    <Text style={styles.postTitle}>{post.title}</Text>
                    <Text style={styles.postMeta}>
                      User {post.userId} · #{post.id}
                    </Text>
                  </View>
                  <Text style={styles.postBody}>{post.body}</Text>
                  <View style={styles.rowWrap}>
                    <Pressable
                      style={[styles.smallButton, styles.primaryButton]}
                      onPress={() => handleEdit(post)}>
                      <Text style={styles.smallButtonText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.smallButton, styles.secondaryButton]}
                      onPress={() => handlePatch(post)}>
                      <Text
                        style={[
                          styles.smallButtonText,
                          styles.secondaryButtonText,
                        ]}>
                        Patch title
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.smallButton, styles.dangerButton]}
                      onPress={() => handleDelete(post)}>
                      <Text style={styles.smallButtonText}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  container: {
    padding: 16,
    gap: 16,
  },
  header: {
    gap: 6,
  },
  kicker: {
    color: '#56708A',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#102A43',
  },
  subtitle: {
    color: '#52616B',
    fontSize: 15,
    lineHeight: 21,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 2,
  },
  feedbackCard: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#102A43',
  },
  sectionHint: {
    color: '#5B6B7A',
    fontSize: 13,
    lineHeight: 19,
  },
  inputLabel: {
    color: '#334E68',
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D6DEE8',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FDFEFF',
    color: '#102A43',
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  rowWrap: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  button: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 130,
  },
  smallButton: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#1D4ED8',
  },
  secondaryButton: {
    backgroundColor: '#E8EEF6',
  },
  dangerButton: {
    backgroundColor: '#DC2626',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  smallButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#102A43',
  },
  helperText: {
    color: '#52616B',
    fontSize: 13,
  },
  feedbackBox: {
    borderRadius: 16,
    padding: 14,
  },
  successBox: {
    backgroundColor: '#E8F7EE',
  },
  errorBox: {
    backgroundColor: '#FDECEC',
  },
  warningBox: {
    backgroundColor: '#FFF4D9',
  },
  infoBox: {
    backgroundColor: '#E8F1FF',
  },
  feedbackText: {
    color: '#102A43',
    fontSize: 14,
    fontWeight: '600',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listHeadingGroup: {
    gap: 3,
  },
  listSummary: {
    color: '#64748B',
    fontSize: 13,
  },
  listMetaRow: {
    flexDirection: 'row',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF4FF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#355070',
    fontSize: 12,
    fontWeight: '700',
  },
  list: {
    gap: 12,
  },
  postCard: {
    borderWidth: 1,
    borderColor: '#E4EAF1',
    borderRadius: 18,
    padding: 14,
    gap: 10,
    backgroundColor: '#FCFDFF',
  },
  postHeader: {
    gap: 4,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#102A43',
    textTransform: 'capitalize',
  },
  postMeta: {
    color: '#64748B',
    fontSize: 12,
  },
  postBody: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    borderWidth: 1,
    borderColor: '#E4EAF1',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 16,
    gap: 4,
    backgroundColor: '#FAFCFF',
  },
  emptyTitle: {
    color: '#102A43',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyText: {
    color: '#52616B',
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: '#B42318',
    fontSize: 14,
    fontWeight: '600',
  },
});

const feedbackStyles = {
  success: styles.successBox,
  error: styles.errorBox,
  warning: styles.warningBox,
  info: styles.infoBox,
} as const;
