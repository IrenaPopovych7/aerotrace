import type { ApiError } from '@aerotrace/contracts';
import type { FastifyInstance } from 'fastify';

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

function body(code: string, message: string, fieldErrors?: Record<string, string>): ApiError {
  return { error: fieldErrors ? { code, message, fieldErrors } : { code, message } };
}

/** Every error leaves the API in the one shape defined by ApiErrorSchema. */
export function registerErrorHandling(app: FastifyInstance): void {
  app.setNotFoundHandler((request, reply) => {
    void reply
      .status(404)
      .send(body('not_found', `Route ${request.method} ${request.url} does not exist`));
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError) {
      return reply
        .status(error.statusCode)
        .send(body(error.code, error.message, error.fieldErrors));
    }
    const statusCode =
      typeof (error as { statusCode?: unknown }).statusCode === 'number'
        ? (error as { statusCode: number }).statusCode
        : 500;
    if (statusCode >= 500) {
      request.log.error({ err: error }, 'unhandled error');
      return reply.status(500).send(body('internal_error', 'Something went wrong'));
    }
    return reply
      .status(statusCode)
      .send(body('bad_request', error instanceof Error ? error.message : 'Bad request'));
  });
}
