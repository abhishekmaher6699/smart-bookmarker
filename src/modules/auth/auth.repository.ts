import { pool } from "../../db/client.js";

export async function findUserByEmail(email: string) {
  const result = await pool.query(
    `
        SELECT * FROM users
        WHERE email = $1;`,
    [email],
  );
  return result.rows[0] ?? null;
}

export async function createUser(email: string, password: string) {
  const result = await pool.query(
    `
        INSERT INTO users (email, password)
        VALUES ($1, $2)
        RETURNING id, email, created_at;`,
    [email, password],
  );
  return result.rows[0];
}

export async function createRefreshToken(
  userId: string,
  familyId: string,
  tokenHash: string,
  expiresAt: Date,
) {
  const result = await pool.query(
    `
        INSERT INTO refresh_tokens (
            user_id,
            family_id,
            token_hash,
            expires_at
        ) 
        VALUES ($1, $2, $3, $4)
        RETURNING id, family_id, user_id, expires_at, created_at;
        `,
    [userId, familyId, tokenHash, expiresAt],
  );
  return result.rows[0];
}

export async function findRefreshToken(tokenHash: string) {
  const result = await pool.query(
    `
        SELECT id,
            user_id,
            token_hash,
            expires_at,
            family_id,
            created_at,
            revoked_at
        FROM refresh_tokens
        WHERE token_hash = $1;
        `,
    [tokenHash],
  );

  return result.rows[0] ?? null;
}

export async function revokeRefreshToken(tokenId: string) {
  const result = await pool.query(
    `
            UPDATE refresh_tokens
            SET revoked_at = NOW()
            WHERE id = $1
                AND revoked_at IS NULL
            RETURNING id;
        `,
    [tokenId],
  );

  return result.rows[0] ?? null;
}

export async function rotateRefreshToken(
  oldTokenId: string,
  userId: string,
  familyId: string,
  newTokenHash: string,
  expiresAt: Date,
) {
  const client = await pool.connect();
  try {

    client.query("BEGIN")

    const revoked = await client.query(
      `
        UPDATE refresh_tokens
        SET revoked_at = NOW()
        WHERE id = $1
            AND user_id = $2
            AND revoked_at IS NULL
        RETURNING id;
        `,
      [oldTokenId, userId],
    );

    if (revoked.rowCount !== 1) {
      throw new Error("Refresh token could no be revoked");
    }

    const created = await client.query(
      `
        INSERT INTO refresh_tokens (
            user_id,
            family_id,
            token_hash,
            expires_at
        ) 
        VALUES ($1, $2, $3, $4)
        RETURNING id, user_id, family_id,  expires_at, created_at;
        `,
      [userId, familyId, newTokenHash, expiresAt],
    );

    await client.query("COMMIT");

    return created.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function revokeRefreshTokenFamily(
    familyId: string
) {
    const result = await pool.query(
        `
        UPDATE refresh_tokens
        SET revoked_at = NOW()
        WHERE family_id = $1
            AND revoked_at IS NULL
        RETURNING id;
        `,
    [familyId]
    )
    return result.rowCount
}