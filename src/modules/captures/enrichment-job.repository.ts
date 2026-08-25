import { pool } from "../../db/client.js";



export async function createEnrichmentJob(
    captureId: string,
) {
    const result = await pool.query(
        `
        INSERT INTO enrichment_jobs (
            capture_id
        )
        VALUES ($1)
        ON CONFLICT (capture_id)
        DO NOTHING
        RETURNING *;
        `,
        [captureId]
    );

    return result.rows[0] ?? null;
}

export async function claimNextEnrichmentJob() {
    const client = await pool.connect()

    try {
        await client.query("BEGIN")

        const result = await client.query(
            `
            SELECT 
                ej.id,
                ej.capture_id,
                c.user_id,
                c.url
            FROM enrichment_jobs ej
            JOIN captures c
                ON c.id = ej.capture_id
            WHERE ej.status = 'pending'
                AND ej.available_at <= NOW()
            ORDER BY ej.created_at ASC
            LIMIT 1
            FOR UPDATE OF ej SKIP LOCKED;
            `
        )

        const job = result.rows[0]

        if (!job) {
            await client.query("COMMIT")
            return null
        }

        const updateResult = await client.query(
            `
            UPDATE enrichment_jobs
            SET
                status = 'processing',
                attempts = attempts + 1,
                started_at = NOW(),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *;
            `,
            [job.id]
        )

        await client.query("COMMIT")

        return {
            ...updateResult.rows[0],
            user_id: job.user_id,
            url: job.url,
        }
    } catch (error) {
        await client.query("ROLLBACK")
        throw error
    } finally {
        client.release()
    }
}

export async function completeEnrichmentJob(
    jobId: string,
) {
    const result = await pool.query(
        `
        UPDATE enrichment_jobs
        SET
            status = 'completed',
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *;
        `,
        [jobId],
    );

    return result.rows[0] ?? null;
}

const MAX_ATTEMPTS = 4


function getRetryDelay(attempt: number) {
    // const delays = [
    //     30_000,
    //     2 * 60_000,
    //     10 * 60_000
    // ]

        const delays = [
        5_000,
        6_000,
        7_000
    ]


    return delays[attempt - 1] ?? null
}


export async function failEnrichmentJob(
    jobId: string,
    error: string,
    attempts : number
) {


    const delay = getRetryDelay(attempts)

    const permanentlyFailed = attempts >= MAX_ATTEMPTS

    const result = await pool.query(
        `
        UPDATE enrichment_jobs
        SET
            status = $1,
            available_at = $2,
            last_error = $3,
            started_at = NULL,
            updated_at = NOW()
        WHERE id = $4
        RETURNING *;
        `,
        [
            permanentlyFailed 
            ? "failed"
            : "pending",

            permanentlyFailed
            ? new Date()
            : new Date(
                Date.now() + delay!,
            ),
            error,
            jobId, 
        ],
    );

    return result.rows[0] ?? null;
}


export async function recoverStuckEnrichmentJobs() {
    const result = await pool.query(
        `
        UPDATE enrichment_jobs
        SET
            status = 'pending',
            available_at = NOW(),
            started_at = NULL,
            updated_at = NOW()
        WHERE status = 'processing'
          AND started_at < NOW() - INTERVAL '10 minutes'
        RETURNING *;
        `,
    );

    return result.rows;
}