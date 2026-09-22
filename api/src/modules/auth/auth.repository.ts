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

export async function findUserById(userId: string) {
  const result = await pool.query(
    `
      SELECT id, email, password
      FROM users
      WHERE id = $1;
    `,
    [userId],
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
    await client.query("BEGIN");

    const tokenResult = await client.query(
      `
        SELECT
          id,
          user_id,
          family_id,
          revoked_at,
          expires_at
        FROM refresh_tokens
        WHERE id = $1
          AND user_id = $2
          AND family_id = $3
        FOR UPDATE;
      `,
      [oldTokenId, userId, familyId],
    );

    const token = tokenResult.rows[0];

    if (!token) {
      await client.query("ROLLBACK");
      return {
        status: "not_found" as const,
      };
    }

    if (token.revoked_at) {
      await client.query("ROLLBACK");
      return {
        status: "already_revoked" as const,
      };
    }

    if (new Date(token.expires_at) <= new Date()) {
      await client.query("ROLLBACK");
      return {
        status: "expired" as const,
      };
    }

    await client.query(
      `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE id = $1
        AND revoked_at IS NULL;
      `,
      [oldTokenId],
    );

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

    return {
      status: "rotated" as const,
      token: created.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function revokeRefreshTokenFamily(familyId: string) {
  const result = await pool.query(
    `
        UPDATE refresh_tokens
        SET revoked_at = NOW()
        WHERE family_id = $1
            AND revoked_at IS NULL
        RETURNING id;
        `,
    [familyId],
  );
  return result.rowCount;
}

export async function updatePasswordAndRevokeSessions(
  userId: string,
  passwordHash: string,
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const updatedUser = await client.query(
      `
      UPDATE users
      SET password = $1
      WHERE id = $2
      RETURNING id;
`,
      [passwordHash, userId],
    );

    if (updatedUser.rowCount != 1) {
      throw new Error("User not found");
    }

    await client.query(
      `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE user_id = $1
        AND revoked_at IS NULL;
      `,
      [userId],
    );

    await client.query("COMMIT");
    return updatedUser.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}


export async function createPasswordResetToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
) {

  const result = await pool.query(
    `
    INSERT INTO password_reset_tokens (
      user_id,
      token_hash,
      expires_at
    )
    VALUES ($1, $2, $3)
    RETURNING id;
    `,
    [userId, tokenHash, expiresAt],
  )

  return result.rows[0]
}

export async function findValidPasswordResetToken(
  tokenHash: string,
) {
  const result = await pool.query(
    `
      SELECT id, user_id
      FROM password_reset_tokens
      WHERE token_hash = $1
        AND used_at IS NULL
        AND expires_at > NOW();
    `,
    [tokenHash],
  );

  return result.rows[0] ?? null;
}

export async function consumePasswordResetToken(
  tokenId: string,
) {
  const result = await pool.query(
    `
      UPDATE password_reset_tokens
      SET used_at = NOW()
      WHERE id = $1
        AND used_at IS NULL
        AND expires_at > NOW()
      RETURNING id, user_id;
    `,
    [tokenId],
  );

  return result.rows[0] ?? null;
}


export async function resetPasswordTransaction(
  userId: string,
  tokenId: string,
  passwordHash: string,
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const tokenResult = await client.query(
      `
        UPDATE password_reset_tokens
        SET used_at = NOW()
        WHERE id = $1
          AND user_id = $2
          AND used_at IS NULL
          AND expires_at > NOW()
        RETURNING id;
      `,
      [tokenId, userId],
    );

    if (tokenResult.rowCount !== 1) {
      throw new Error("Invalid or expired reset token");
    }

    const userResult = await client.query(
      `
        UPDATE users
        SET password = $1
        WHERE id = $2
        RETURNING id;
      `,
      [passwordHash, userId],
    );

    if (userResult.rowCount !== 1) {
      throw new Error("User not found");
    }

    await client.query(
      `
        UPDATE refresh_tokens
        SET revoked_at = NOW()
        WHERE user_id = $1
          AND revoked_at IS NULL;
      `,
      [userId],
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}




export async function createEmailVerificationToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
) {
  const result = await pool.query(
    `
      INSERT INTO email_verification_tokens (
        user_id,
        token_hash,
        expires_at
      )
      VALUES ($1, $2, $3)
      RETURNING id;
    `,
    [userId, tokenHash, expiresAt],
  );

  return result.rows[0];
}

export async function findValidEmailVerificationToken(
  tokenHash: string,
) {
  const result = await pool.query(
    `
      SELECT id, user_id
      FROM email_verification_tokens
      WHERE token_hash = $1
        AND used_at IS NULL
        AND expires_at > NOW();
    `,
    [tokenHash],
  );

  return result.rows[0] ?? null;
}
export async function verifyEmailTransaction(
  userId: string,
  tokenId: string,
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const tokenResult = await client.query(
      `
        UPDATE email_verification_tokens
        SET used_at = NOW()
        WHERE id = $1
          AND user_id = $2
          AND used_at IS NULL
          AND expires_at > NOW()
        RETURNING id;
      `,
      [tokenId, userId],
    );

    if (tokenResult.rowCount !== 1) {
      throw new Error("Invalid or expired verification token");
    }

    const userResult = await client.query(
      `
        UPDATE users
        SET email_verified_at = NOW()
        WHERE id = $1
        RETURNING id;
      `,
      [userId],
    );

    if (userResult.rowCount !== 1) {
      throw new Error("User not found");
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}