/** User-owned preferences that can influence correction behavior. */
export type ResolvedUserPreferences = {
  id: string | null;
  userId: string;
  correctionInstructions: string | null;
};

/** Input accepted when updating user-owned correction preferences. */
export type UpdateUserPreferencesInput = {
  userId: string;
  correctionInstructions: string | null;
};

/** Repository contract for user-owned correction preferences. */
export type UserPreferencesRepository = {
  getUserPreferences(userId: string): Promise<ResolvedUserPreferences>;
  updateUserPreferences(
    input: UpdateUserPreferencesInput,
  ): Promise<ResolvedUserPreferences>;
};
