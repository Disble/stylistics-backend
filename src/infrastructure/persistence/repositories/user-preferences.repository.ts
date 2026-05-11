import { eq } from "drizzle-orm";

import type {
  ResolvedUserPreferences,
  UpdateUserPreferencesInput,
  UserPreferencesRepository,
} from "../../../domain/user-preferences/user-preferences.types";
import { persistenceDb } from "../db";
import { userPreferences } from "../schema/user-preferences.schemas";

/** PostgreSQL/Drizzle implementation of user-owned correction preferences. */
export class PgUserPreferencesRepository implements UserPreferencesRepository {
  constructor(private readonly db = persistenceDb) {}

  private static normalizeCorrectionInstructions(
    value: string | null | undefined,
  ) {
    const normalized = value?.trim();

    return normalized ? normalized : null;
  }

  async getUserPreferences(userId: string): Promise<ResolvedUserPreferences> {
    const preferences = await this.db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    });

    return {
      id: preferences?.id ?? null,
      userId,
      correctionInstructions:
        PgUserPreferencesRepository.normalizeCorrectionInstructions(
          preferences?.correctionInstructions,
        ),
    };
  }

  async updateUserPreferences(
    input: UpdateUserPreferencesInput,
  ): Promise<ResolvedUserPreferences> {
    const correctionInstructions = input.correctionInstructions?.trim() ?? "";
    const now = new Date();
    const [preferences] = await this.db
      .insert(userPreferences)
      .values({
        userId: input.userId,
        correctionInstructions,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          correctionInstructions,
          updatedAt: now,
        },
      })
      .returning();

    if (!preferences) {
      throw new Error("User preferences update did not return preferences.");
    }

    return {
      id: preferences.id,
      userId: preferences.userId,
      correctionInstructions:
        PgUserPreferencesRepository.normalizeCorrectionInstructions(
          preferences.correctionInstructions,
        ),
    };
  }
}
